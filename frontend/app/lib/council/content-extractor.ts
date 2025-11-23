/**
 * Content Extractor for AI Council
 * Fetches and preprocesses content from various sources
 */

export interface SubmissionContent {
  type: 'github' | 'tweet' | 'video' | 'image' | 'text' | 'unknown';
  url: string;
  extractedData: {
    text?: string;
    images?: string[];  // URLs or base64
    videos?: string[];
    code?: CodeAnalysis;
    metadata?: Record<string, any>;
  };
  trustLevel: 'verified' | 'unverified';
  extractionTimestamp: Date;
}

export interface CodeAnalysis {
  files: CodeFile[];
  stats: {
    totalLines: number;
    totalFiles: number;
    languages: Record<string, number>;
  };
  readme?: string;
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  lines: number;
}

export class ContentExtractor {
  private githubToken?: string;
  private youtubeApiKey?: string;

  constructor(config?: { githubToken?: string; youtubeApiKey?: string }) {
    this.githubToken = config?.githubToken || process.env.GITHUB_TOKEN;
    this.youtubeApiKey = config?.youtubeApiKey || process.env.YOUTUBE_API_KEY;
  }

  async extractContent(url: string): Promise<SubmissionContent> {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname.includes('github.com')) {
        return await this.extractGitHubContent(url);
      } else if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        return await this.extractTwitterContent(url);
      } else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        return await this.extractYouTubeContent(url);
      }

      // Unknown type - return basic structure
      return {
        type: 'unknown',
        url,
        extractedData: {},
        trustLevel: 'unverified',
        extractionTimestamp: new Date()
      };
    } catch (error) {
      console.error('Content extraction error:', error);
      throw new Error(`Failed to extract content from ${url}: ${error}`);
    }
  }

  private async extractGitHubContent(url: string): Promise<SubmissionContent> {
    // Parse GitHub URL (repo, PR, issue, etc.)
    const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\/|$)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo] = repoMatch;
    const cleanRepo = repo.replace(/\.git$/, '');

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Council-Bot'
    };

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }

    try {
      // Fetch repository metadata
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        headers
      });

      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status} ${repoResponse.statusText}`);
      }

      const repoData = await repoResponse.json();

      // Fetch README
      let readme = '';
      try {
        const readmeResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
          {
            headers: {
              ...headers,
              'Accept': 'application/vnd.github.raw'
            }
          }
        );

        if (readmeResponse.ok) {
          readme = await readmeResponse.text();
          // Limit README size
          if (readme.length > 10000) {
            readme = readme.substring(0, 10000) + '\n\n[... README truncated for length ...]';
          }
        }
      } catch (error) {
        console.warn('Failed to fetch README:', error);
      }

      // Fetch repository contents (root level)
      let codeFiles: CodeFile[] = [];
      try {
        const contentsResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/contents`,
          { headers }
        );

        if (contentsResponse.ok) {
          const contents = await contentsResponse.json();

          // Filter for code files and fetch them (limit to 10 files, max 2000 lines each)
          const codeExtensions = /\.(js|ts|jsx|tsx|py|sol|rs|go|java|cpp|c|h|css|html|md)$/;
          const codeItems = Array.isArray(contents)
            ? contents.filter((item: any) =>
                item.type === 'file' && codeExtensions.test(item.name)
              ).slice(0, 10)
            : [];

          for (const file of codeItems) {
            try {
              // For files under 1MB, fetch directly
              if (file.size && file.size < 1024 * 1024) {
                const fileResponse = await fetch(file.download_url);
                if (fileResponse.ok) {
                  const content = await fileResponse.text();
                  const lines = content.split('\n').length;

                  // Only include files under 2000 lines
                  if (lines <= 2000) {
                    codeFiles.push({
                      path: file.path,
                      content,
                      language: this.detectLanguage(file.name),
                      lines
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch file ${file.path}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch repository contents:', error);
      }

      // Calculate statistics
      const stats = this.calculateCodeStats(codeFiles);

      return {
        type: 'github',
        url,
        extractedData: {
          text: readme,
          code: {
            files: codeFiles,
            stats,
            readme
          },
          metadata: {
            name: repoData.name,
            description: repoData.description,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language,
            created_at: repoData.created_at,
            updated_at: repoData.updated_at,
            pushed_at: repoData.pushed_at,
            size: repoData.size,
            openIssues: repoData.open_issues_count,
            license: repoData.license?.name
          }
        },
        trustLevel: 'verified',
        extractionTimestamp: new Date()
      };
    } catch (error) {
      console.error('GitHub extraction error:', error);
      throw error;
    }
  }

  private async extractTwitterContent(url: string): Promise<SubmissionContent> {
    // Twitter/X API requires authentication and has strict rate limits
    // For now, we'll extract what we can from the URL and return metadata
    // In production, you'd use Twitter API v2 or a scraping service

    const tweetIdMatch = url.match(/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

    // Note: Actual Twitter API integration would require:
    // - Twitter API v2 credentials
    // - Bearer token
    // - Rate limiting handling
    // For MVP, return structure with note about manual review

    return {
      type: 'tweet',
      url,
      extractedData: {
        text: 'Note: Tweet content extraction requires Twitter API access. Manual review recommended.',
        metadata: {
          tweetId,
          note: 'For production: Integrate Twitter API v2 or use scraping service like twscrape',
          requiresManualReview: true
        }
      },
      trustLevel: 'unverified',
      extractionTimestamp: new Date()
    };

    // Production implementation would look like:
    /*
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        }
      }
    );

    const data = await response.json();
    return {
      type: 'tweet',
      url,
      extractedData: {
        text: data.data.text,
        images: data.includes?.media?.filter(m => m.type === 'photo').map(m => m.url) || [],
        videos: data.includes?.media?.filter(m => m.type === 'video').map(m => m.preview_image_url) || [],
        metadata: {
          likes: data.data.public_metrics.like_count,
          retweets: data.data.public_metrics.retweet_count,
          replies: data.data.public_metrics.reply_count,
          created_at: data.data.created_at
        }
      },
      trustLevel: 'verified',
      extractionTimestamp: new Date()
    };
    */
  }

  private async extractYouTubeContent(url: string): Promise<SubmissionContent> {
    const videoId = this.extractYouTubeVideoId(url);

    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    if (!this.youtubeApiKey) {
      // Return basic structure if no API key
      return {
        type: 'video',
        url,
        extractedData: {
          videos: [url],
          metadata: {
            videoId,
            note: 'YouTube API key not configured. Add YOUTUBE_API_KEY to environment variables.',
            requiresManualReview: true
          }
        },
        trustLevel: 'unverified',
        extractionTimestamp: new Date()
      };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${this.youtubeApiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = data.items[0];

      return {
        type: 'video',
        url,
        extractedData: {
          text: video.snippet.description,
          videos: [url],
          metadata: {
            videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            duration: video.contentDetails?.duration,
            views: parseInt(video.statistics.viewCount || '0'),
            likes: parseInt(video.statistics.likeCount || '0'),
            comments: parseInt(video.statistics.commentCount || '0'),
            publishedAt: video.snippet.publishedAt,
            channelTitle: video.snippet.channelTitle,
            tags: video.snippet.tags || []
          }
        },
        trustLevel: 'verified',
        extractionTimestamp: new Date()
      };
    } catch (error) {
      console.error('YouTube extraction error:', error);
      throw error;
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
      /youtube\.com\/v\/([^?&\s]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      sol: 'solidity',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      css: 'css',
      html: 'html',
      md: 'markdown'
    };
    return langMap[ext || ''] || 'unknown';
  }

  private calculateCodeStats(files: CodeFile[]): CodeAnalysis['stats'] {
    const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
    const totalFiles = files.length;
    const languages: Record<string, number> = {};

    for (const file of files) {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }

    return {
      totalLines,
      totalFiles,
      languages
    };
  }

  /**
   * Extract a summary suitable for sharing with other agents
   */
  extractSummary(content: SubmissionContent): string {
    const parts: string[] = [];

    parts.push(`Content Type: ${content.type.toUpperCase()}`);
    parts.push(`URL: ${content.url}`);

    if (content.type === 'github') {
      const meta = content.extractedData.metadata;
      parts.push(`\nRepository: ${meta?.name}`);
      parts.push(`Description: ${meta?.description || 'None'}`);
      parts.push(`Stars: ${meta?.stars || 0} | Forks: ${meta?.forks || 0}`);
      parts.push(`Primary Language: ${meta?.language || 'Unknown'}`);

      if (content.extractedData.code) {
        const stats = content.extractedData.code.stats;
        parts.push(`\nCode Stats: ${stats.totalFiles} files, ${stats.totalLines} lines`);
        parts.push(`Languages: ${Object.keys(stats.languages).join(', ')}`);
      }

      if (content.extractedData.text) {
        parts.push(`\nREADME Preview: ${content.extractedData.text.substring(0, 300)}...`);
      }
    } else if (content.type === 'video') {
      const meta = content.extractedData.metadata;
      parts.push(`\nTitle: ${meta?.title || 'Unknown'}`);
      parts.push(`Duration: ${meta?.duration || 'Unknown'}`);
      parts.push(`Views: ${meta?.views || 0} | Likes: ${meta?.likes || 0}`);

      if (content.extractedData.text) {
        parts.push(`\nDescription: ${content.extractedData.text.substring(0, 300)}...`);
      }
    } else if (content.type === 'tweet') {
      parts.push(`\n${content.extractedData.text}`);
    }

    return parts.join('\n');
  }
}

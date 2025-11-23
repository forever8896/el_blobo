/**
 * Simplified Content Extractor
 *
 * PHILOSOPHY: Let AI models use their NATIVE capabilities
 * - Grok has direct X/Twitter access
 * - Gemini can process video URLs natively
 * - GPT-4o can analyze images from URLs
 * - Models share insights with each other
 *
 * NO external API tokens needed!
 */

export interface SubmissionContent {
  type: 'github' | 'tweet' | 'video' | 'image' | 'text' | 'unknown';
  url: string;
  rawNotes: string;
}

export class ContentExtractor {
  /**
   * Simply classify the URL type - models handle the rest
   */
  async extractContent(url: string, notes: string): Promise<SubmissionContent> {
    const urlObj = new URL(url);

    // Classify content type based on URL
    let type: SubmissionContent['type'] = 'unknown';

    if (urlObj.hostname.includes('github.com')) {
      type = 'github';
    } else if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      type = 'tweet';
    } else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      type = 'video';
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(urlObj.pathname)) {
      type = 'image';
    }

    return {
      type,
      url,
      rawNotes: notes
    };
  }

  /**
   * Create a simple summary for sharing between agents
   */
  extractSummary(content: SubmissionContent): string {
    return `Content Type: ${content.type.toUpperCase()}
URL: ${content.url}
Notes: ${content.rawNotes || 'None provided'}`;
  }
}

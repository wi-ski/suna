import axios from 'axios';
import { Tool, ToolResult, openApiSchema, xmlSchema } from '@suna/agentpress';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

interface SearchResponse {
  query: string;
  answer: string;
  results: SearchResult[];
  images?: string[];
  followUpQuestions?: string[];
}

/**
 * Web Search Tool
 * Direct port from Python agent/tools/sb_web_search_tool.py
 */
export class WebSearchTool extends Tool {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor() {
    super();
    this.apiKey = process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('TAVILY_API_KEY not found. Web search will not work.');
    }
  }

  @openApiSchema({
    name: 'web_search',
    description: 'Search the web for information and get direct answers',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Search query to find information about' 
        },
        num_results: { 
          type: 'number', 
          description: 'Number of search results to return',
          default: 10,
          minimum: 1,
          maximum: 20
        },
        include_images: {
          type: 'boolean',
          description: 'Whether to include relevant images',
          default: false
        }
      },
      required: ['query']
    }
  })
  @xmlSchema({
    name: 'web-search',
    description: 'Search the web for information and get direct answers',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query to find information about' },
      { name: 'num_results', type: 'number', description: 'Number of search results to return' },
      { name: 'include_images', type: 'boolean', description: 'Whether to include relevant images' }
    ]
  })
  async search(query: string, numResults: number = 10, includeImages: boolean = false): Promise<ToolResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'TAVILY_API_KEY not configured. Please set the environment variable.'
        };
      }

      const response = await axios.post(, {
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_images: includeImages,
        include_raw_content: false,
        max_results: Math.min(numResults, 20),
        include_domains: [],
        exclude_domains: []
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 
        },
        timeout: 30000
      });

      const data = response.data;
      
      const searchResponse: SearchResponse = {
        query: data.query || query,
        answer: data.answer || 'No direct answer available',
        results: (data.results || []).map((result: any, index: number) => ({
          title: result.title || 'No title',
          url: result.url || '',
          snippet: result.content || result.snippet || 'No snippet available',
          score: result.score || (1 - index * 0.1)
        })),
        images: includeImages ? (data.images || []) : undefined,
        followUpQuestions: data.follow_up_questions || []
      };

      // Format output for agent
      let output = ;
      
      if (searchResponse.answer && searchResponse.answer !== 'No direct answer available') {
        output += ;
      }

      output += ;
      
      searchResponse.results.forEach((result, index) => {
        output += ;
        output += ;
        output += ;
        output += ;
      });

      if (searchResponse.images && searchResponse.images.length > 0) {
        output += ;
        searchResponse.images.slice(0, 5).forEach((image, index) => {
          output += ;
        });
        output += '\n';
      }

      if (searchResponse.followUpQuestions && searchResponse.followUpQuestions.length > 0) {
        output += ;
        searchResponse.followUpQuestions.forEach((question, index) => {
          output += ;
        });
      }

      return {
        success: true,
        output,
        metadata: {
          query: searchResponse.query,
          answer: searchResponse.answer,
          resultCount: searchResponse.results.length,
          imageCount: searchResponse.images?.length || 0,
          searchResults: searchResponse.results,
          images: searchResponse.images,
          followUpQuestions: searchResponse.followUpQuestions
        }
      };

    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        errorMessage = ;
      } else if (error.request) {
        errorMessage = 'Network error: Unable to reach search API';
      } else {
        errorMessage = error.message || 'Search request failed';
      }

      return {
        success: false,
        error: ,
        metadata: {
          query,
          errorType: error.response ? 'api_error' : error.request ? 'network_error' : 'unknown_error'
        }
      };
    }
  }

  @openApiSchema({
    name: 'scrape_webpage',
    description: 'Scrape content from specific web pages',
    parameters: {
      type: 'object',
      properties: {
        urls: {
          type: 'string',
          description: 'Comma-separated URLs to scrape content from'
        }
      },
      required: ['urls']
    }
  })
  @xmlSchema({
    name: 'scrape-webpage',
    description: 'Scrape content from specific web pages',
    parameters: [
      { name: 'urls', type: 'string', description: 'Comma-separated URLs to scrape content from' }
    ]
  })
  async scrapeWebpage(urls: string): Promise<ToolResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'TAVILY_API_KEY not configured. Please set the environment variable.'
        };
      }

      const urlList = urls.split(',').map(url => url.trim()).filter(url => url.length > 0);
      
      if (urlList.length === 0) {
        return {
          success: false,
          error: 'No valid URLs provided'
        };
      }

      const response = await axios.post(, {
        urls: urlList
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 
        },
        timeout: 45000
      });

      const data = response.data;
      const results = data.results || [];

      let output = ;
      output += ;

      results.forEach((result: any, index: number) => {
        output += ;
        output += ;
        output += ;
        output += ;
      });

      return {
        success: true,
        output,
        metadata: {
          urls: urlList,
          resultCount: results.length,
          extractedContent: results
        }
      };

    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        errorMessage = ;
      } else if (error.request) {
        errorMessage = 'Network error: Unable to reach extraction API';
      } else {
        errorMessage = error.message || 'Extraction request failed';
      }

      return {
        success: false,
        error: ,
        metadata: {
          urls: urls.split(',').map(url => url.trim()),
          errorType: error.response ? 'api_error' : error.request ? 'network_error' : 'unknown_error'
        }
      };
    }
  }
}

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Tool, ToolResult, openApiSchema, xmlSchema } from '@suna/agentpress';

/**
 * Browser Tool for web automation
 * Direct port from Python agent/tools/sb_browser_tool.py
 */
export class BrowserTool extends Tool {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    this.isInitialized = true;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
    }
  }

  @openApiSchema({
    name: 'browser_navigate_to',
    description: 'Navigate to a URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' }
      },
      required: ['url']
    }
  })
  @xmlSchema({
    name: 'browser-navigate-to',
    description: 'Navigate to a URL',
    parameters: [
      { name: 'url', type: 'string', description: 'URL to navigate to' }
    ]
  })
  async navigateTo(url: string): Promise<ToolResult> {
    try {
      await this.initialize();
      if (!this.page) throw new Error('Page not initialized');

      await this.page.goto(url, { waitUntil: 'networkidle' });
      const title = await this.page.title();
      
      return {
        success: true,
        output: ,
        metadata: { url, title }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }

  @openApiSchema({
    name: 'browser_click_element',
    description: 'Click an element by index from the page',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Index of element to click' }
      },
      required: ['index']
    }
  })
  @xmlSchema({
    name: 'browser-click-element',
    description: 'Click an element by index',
    parameters: [
      { name: 'index', type: 'number', description: 'Index of element to click' }
    ]
  })
  async clickElement(index: number): Promise<ToolResult> {
    try {
      if (!this.page) throw new Error('Page not initialized');

      // Get all clickable elements
      const elements = await this.page.locator('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]').all();
      
      if (index >= elements.length) {
        return {
          success: false,
          error: 
        };
      }

      await elements[index].click();
      
      return {
        success: true,
        output: ,
        metadata: { index, totalElements: elements.length }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }

  @openApiSchema({
    name: 'browser_input_text',
    description: 'Input text into a form field',
    parameters: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Index of input field' },
        text: { type: 'string', description: 'Text to input' }
      },
      required: ['index', 'text']
    }
  })
  @xmlSchema({
    name: 'browser-input-text',
    description: 'Input text into a form field',
    parameters: [
      { name: 'index', type: 'number', description: 'Index of input field' },
      { name: 'text', type: 'string', description: 'Text to input' }
    ]
  })
  async inputText(index: number, text: string): Promise<ToolResult> {
    try {
      if (!this.page) throw new Error('Page not initialized');

      const inputs = await this.page.locator('input, textarea').all();
      
      if (index >= inputs.length) {
        return {
          success: false,
          error: 
        };
      }

      await inputs[index].fill(text);
      
      return {
        success: true,
        output: ,
        metadata: { index, text: text.substring(0, 50) + (text.length > 50 ? '...' : '') }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }

  @openApiSchema({
    name: 'browser_get_page_content',
    description: 'Get the current page content',
    parameters: { type: 'object', properties: {} }
  })
  @xmlSchema({
    name: 'browser-get-page-content',
    description: 'Get the current page content',
    parameters: []
  })
  async getPageContent(): Promise<ToolResult> {
    try {
      if (!this.page) throw new Error('Page not initialized');

      const content = await this.page.content();
      const text = await this.page.textContent('body') || '';
      const url = this.page.url();
      const title = await this.page.title();

      return {
        success: true,
        output: ,
        metadata: {
          url,
          title,
          textContent: text.substring(0, 2000) + (text.length > 2000 ? '...' : ''),
          htmlContent: content.substring(0, 5000) + (content.length > 5000 ? '...' : '')
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }

  @openApiSchema({
    name: 'browser_scroll_down',
    description: 'Scroll down the page',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Pixels to scroll down', default: 500 }
      }
    }
  })
  @xmlSchema({
    name: 'browser-scroll-down',
    description: 'Scroll down the page',
    parameters: [
      { name: 'amount', type: 'number', description: 'Pixels to scroll down' }
    ]
  })
  async scrollDown(amount: number = 500): Promise<ToolResult> {
    try {
      if (!this.page) throw new Error('Page not initialized');

      await this.page.evaluate((pixels) => {
        window.scrollBy(0, pixels);
      }, amount);

      return {
        success: true,
        output: ,
        metadata: { amount }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }

  @openApiSchema({
    name: 'browser_wait',
    description: 'Wait for a specified number of seconds',
    parameters: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'Seconds to wait' }
      },
      required: ['seconds']
    }
  })
  @xmlSchema({
    name: 'browser-wait',
    description: 'Wait for a specified number of seconds',
    parameters: [
      { name: 'seconds', type: 'number', description: 'Seconds to wait' }
    ]
  })
  async wait(seconds: number): Promise<ToolResult> {
    try {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      
      return {
        success: true,
        output: ,
        metadata: { seconds }
      };
    } catch (error) {
      return {
        success: false,
        error: 
      };
    }
  }
}

/**
 * Job Executor - Handles execution of different job types
 */

import {
  Job,
  JobAction,
  JobError,
  BrowserAction,
  ActionInstruction,
} from '../shared/types';
import { ApiClient } from './api-client';

export class JobExecutor {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Execute a job based on its action type
   */
  async executeJob(job: Job): Promise<void> {
    console.log(`[JobExecutor] Executing job ${job.id} - Action: ${job.action}`);

    try {
      // Update job status to in_progress
      await this.apiClient.updateJobStatus(job.id, {
        status: 'in_progress' as any,
        progress: 0,
        currentStep: `Starting ${job.action}`,
      });

      // Execute based on action type
      switch (job.action) {
        case JobAction.SEARCH_RESTAURANT:
          await this.executeSearchRestaurant(job);
          break;

        case JobAction.SELECT_RESTAURANT:
          await this.executeSelectRestaurant(job);
          break;

        case JobAction.BROWSE_MENU:
          await this.executeBrowseMenu(job);
          break;

        case JobAction.ADD_TO_CART:
          await this.executeAddToCart(job);
          break;

        case JobAction.MODIFY_CART:
          await this.executeModifyCart(job);
          break;

        case JobAction.CHECKOUT:
          await this.executeCheckout(job);
          break;

        case JobAction.FILL_ADDRESS:
          await this.executeFillAddress(job);
          break;

        case JobAction.CONFIRM_ORDER:
          await this.executeConfirmOrder(job);
          break;

        case JobAction.EXTRACT_DATA:
          await this.executeExtractData(job);
          break;

        default:
          throw new Error(`Unknown job action: ${job.action}`);
      }

      console.log(`[JobExecutor] Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[JobExecutor] Job ${job.id} failed:`, error);

      const jobError: JobError = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          jobId: job.id,
          action: job.action,
        },
      };

      await this.apiClient.reportJobFailure(job.id, jobError);
      throw error;
    }
  }

  /**
   * Execute search restaurant action
   */
  private async executeSearchRestaurant(job: Job): Promise<void> {
    const { searchQuery, platform } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 25,
      currentStep: 'Searching for restaurants',
    });

    // Send message to content script to perform search
    const action: ActionInstruction = {
      action: BrowserAction.SEARCH_RESTAURANT,
      value: searchQuery,
    };

    const result = await this.sendToContentScript(action, platform as string);

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 75,
      currentStep: 'Processing search results',
    });

    // Save search results
    await this.apiClient.saveJobData(job.id, {
      searchQuery,
      results: result,
      timestamp: Date.now(),
    });

    await this.apiClient.completeJob(job.id, {
      restaurantsFound: result?.restaurantCount || 0,
    });
  }

  /**
   * Execute select restaurant action
   */
  private async executeSelectRestaurant(job: Job): Promise<void> {
    const { restaurantId, restaurantName } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 30,
      currentStep: `Selecting restaurant: ${restaurantName}`,
    });

    const action: ActionInstruction = {
      action: BrowserAction.SELECT_RESTAURANT,
      target: restaurantId as string,
    };

    await this.sendToContentScript(action, job.platform);

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 80,
      currentStep: 'Loading restaurant menu',
    });

    await this.apiClient.completeJob(job.id, {
      restaurantSelected: restaurantName,
    });
  }

  /**
   * Execute browse menu action
   */
  private async executeBrowseMenu(job: Job): Promise<void> {
    const { category, filters } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 25,
      currentStep: 'Browsing menu',
    });

    const action: ActionInstruction = {
      action: BrowserAction.BROWSE_MENU,
      value: { category, filters },
    };

    const result = await this.sendToContentScript(action, job.platform);

    await this.apiClient.saveJobData(job.id, {
      menuData: result,
      timestamp: Date.now(),
    });

    await this.apiClient.completeJob(job.id, {
      itemsFound: result?.itemCount || 0,
    });
  }

  /**
   * Execute add to cart action
   */
  private async executeAddToCart(job: Job): Promise<void> {
    const { items } = job.payload;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No items specified for cart');
    }

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 10,
      currentStep: `Adding ${items.length} items to cart`,
    });

    // Add items sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const progress = 10 + ((i + 1) / items.length) * 80;

      await this.apiClient.updateJobStatus(job.id, {
        status: 'in_progress' as any,
        progress: Math.round(progress),
        currentStep: `Adding ${item.name} to cart`,
      });

      const action: ActionInstruction = {
        action: BrowserAction.ADD_TO_CART,
        target: item.id,
        value: {
          quantity: item.quantity || 1,
          customizations: item.customizations || [],
        },
      };

      await this.sendToContentScript(action, job.platform);

      // Small delay between items
      await this.delay(500);
    }

    await this.apiClient.completeJob(job.id, {
      itemsAdded: items.length,
    });
  }

  /**
   * Execute modify cart action
   */
  private async executeModifyCart(job: Job): Promise<void> {
    const { modifications } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 30,
      currentStep: 'Modifying cart',
    });

    const action: ActionInstruction = {
      action: BrowserAction.MODIFY_CART,
      value: modifications,
    };

    await this.sendToContentScript(action, job.platform);

    await this.apiClient.completeJob(job.id, {
      cartModified: true,
    });
  }

  /**
   * Execute checkout action
   */
  private async executeCheckout(job: Job): Promise<void> {
    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 20,
      currentStep: 'Initiating checkout',
    });

    const action: ActionInstruction = {
      action: BrowserAction.CHECKOUT,
    };

    await this.sendToContentScript(action, job.platform);

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 70,
      currentStep: 'Navigating to checkout page',
    });

    await this.apiClient.completeJob(job.id, {
      checkoutInitiated: true,
    });
  }

  /**
   * Execute fill address action
   */
  private async executeFillAddress(job: Job): Promise<void> {
    const { address } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 30,
      currentStep: 'Filling delivery address',
    });

    const action: ActionInstruction = {
      action: BrowserAction.FILL_ADDRESS,
      value: address,
    };

    await this.sendToContentScript(action, job.platform);

    await this.apiClient.completeJob(job.id, {
      addressFilled: true,
    });
  }

  /**
   * Execute confirm order action
   */
  private async executeConfirmOrder(job: Job): Promise<void> {
    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 40,
      currentStep: 'Confirming order',
    });

    const action: ActionInstruction = {
      action: BrowserAction.CONFIRM_ORDER,
    };

    const result = await this.sendToContentScript(action, job.platform);

    await this.apiClient.completeJob(job.id, {
      orderConfirmed: true,
      orderId: result?.orderId,
    });
  }

  /**
   * Execute extract data action
   */
  private async executeExtractData(job: Job): Promise<void> {
    const { dataType } = job.payload;

    await this.apiClient.updateJobStatus(job.id, {
      status: 'in_progress' as any,
      progress: 30,
      currentStep: `Extracting ${dataType} data`,
    });

    const action: ActionInstruction = {
      action: BrowserAction.WAIT, // Custom extraction action
      value: { extractType: dataType },
    };

    const result = await this.sendToContentScript(action, job.platform);

    await this.apiClient.saveJobData(job.id, {
      extractedData: result,
      timestamp: Date.now(),
    });

    await this.apiClient.completeJob(job.id, {
      dataExtracted: true,
    });
  }

  /**
   * Send action instruction to content script
   */
  private async sendToContentScript(
    action: ActionInstruction,
    _platform: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get active tab for the platform
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab found'));
          return;
        }

        // Send message to content script
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: 'EXECUTE_ACTION',
            payload: action,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            resolve(response);
          }
        );
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Content script response timeout'));
      }, 30000);
    });
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

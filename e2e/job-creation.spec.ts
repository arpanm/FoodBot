import { test, expect } from '@playwright/test';
import { loginViaAPI, TEST_USERS } from './helpers/auth-helper';
import { createTestJob, pollJobUntilComplete, getJobStatus } from './helpers/api-helper';
import { SELECTORS, TEST_JOBS } from './fixtures/test-data';

/**
 * E2E Tests for Job Creation and Polling
 * Tests the job creation workflow and status polling
 */

test.describe('Job Creation and Polling', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Login and get auth token
    authToken = await loginViaAPI(page, TEST_USERS.customer.email, TEST_USERS.customer.password);
  });

  test('should create job via chatbot and display job ID', async ({ page }) => {
    // Navigate to chat interface
    await page.goto('/chat');

    // Send message to create job
    await page.fill(SELECTORS.chatInput, 'Order pizza from Dominos');
    await page.click(SELECTORS.sendButton);

    // Wait for job creation response
    await page.waitForSelector('[data-testid="job-created"]', { timeout: 10000 });

    // Verify job ID is displayed
    const jobIdElement = page.locator(SELECTORS.jobId);
    await expect(jobIdElement).toBeVisible();

    const jobId = await jobIdElement.textContent();
    expect(jobId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  test('should poll job status and display progress', async ({ page }) => {
    // Create job via API
    const job = await createTestJob(
      page.request,
      {
        action: 'search_restaurant',
        platform: 'swiggy',
        payload: { query: 'pizza' },
      },
      authToken
    );

    // Navigate to job tracking page
    await page.goto(`/jobs/${job.id}`);

    // Verify initial status
    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('pending');

    // Wait for progress tracker to appear
    await page.waitForSelector(SELECTORS.progressTracker);

    // Verify progress tracker shows steps
    const progressSteps = page.locator('[data-testid="progress-step"]');
    await expect(progressSteps).toHaveCount(3); // Assuming 3 steps

    // Wait for job to start processing
    await page.waitForSelector('[data-testid="job-status"][data-status="in_progress"]', {
      timeout: 30000,
    });

    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('in_progress');
  });

  test('should update status in real-time via WebSocket', async ({ page }) => {
    // Create job via API
    const job = await createTestJob(
      page.request,
      {
        action: 'search_restaurant',
        platform: 'swiggy',
        payload: { query: 'burger' },
      },
      authToken
    );

    // Navigate to job tracking page
    await page.goto(`/jobs/${job.id}`);

    // Wait for WebSocket connection
    await page.waitForTimeout(2000);

    // Monitor status changes
    const statusChanges: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Job status updated')) {
        statusChanges.push(msg.text());
      }
    });

    // Wait for job to complete
    await page.waitForSelector('[data-testid="job-status"][data-status="completed"]', {
      timeout: 60000,
    });

    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('completed');

    // Verify we received status updates
    expect(statusChanges.length).toBeGreaterThan(0);
  });

  test('should display job result when completed', async ({ page }) => {
    // Create job via API
    const job = await createTestJob(
      page.request,
      {
        action: 'search_restaurant',
        platform: 'swiggy',
        payload: { query: 'sushi' },
      },
      authToken
    );

    // Navigate to job tracking page
    await page.goto(`/jobs/${job.id}`);

    // Wait for job to complete
    await page.waitForSelector('[data-testid="job-status"][data-status="completed"]', {
      timeout: 60000,
    });

    // Verify result is displayed
    const resultSection = page.locator('[data-testid="job-result"]');
    await expect(resultSection).toBeVisible();

    // Verify result contains data
    const resultData = await resultSection.textContent();
    expect(resultData).toBeTruthy();
  });

  test('should handle job failure gracefully', async ({ page }) => {
    // Create job that will fail
    const job = await createTestJob(
      page.request,
      {
        action: 'invalid_action',
        platform: 'swiggy',
        payload: {},
      },
      authToken
    );

    // Navigate to job tracking page
    await page.goto(`/jobs/${job.id}`);

    // Wait for job to fail
    await page.waitForSelector('[data-testid="job-status"][data-status="failed"]', {
      timeout: 30000,
    });

    await expect(page.locator(SELECTORS.jobStatus)).toHaveText('failed');

    // Verify error message is displayed
    const errorSection = page.locator('[data-testid="job-error"]');
    await expect(errorSection).toBeVisible();

    const errorMessage = await errorSection.textContent();
    expect(errorMessage).toContain('error');
  });

  test('should list all user jobs', async ({ page }) => {
    // Create multiple jobs
    const jobs = await Promise.all([
      createTestJob(page.request, TEST_JOBS.searchRestaurant, authToken),
      createTestJob(page.request, TEST_JOBS.addToCart, authToken),
      createTestJob(page.request, TEST_JOBS.checkout, authToken),
    ]);

    // Navigate to jobs list page
    await page.goto('/jobs');

    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-card"]');

    // Verify all jobs are displayed
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards).toHaveCount(jobs.length);

    // Verify job IDs match
    for (const job of jobs) {
      await expect(page.locator(`[data-testid="job-card-${job.id}"]`)).toBeVisible();
    }
  });

  test('should filter jobs by status', async ({ page }) => {
    // Navigate to jobs list page
    await page.goto('/jobs');

    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-card"]');

    // Apply filter for completed jobs
    await page.click('[data-testid="filter-status"]');
    await page.click('[data-testid="filter-completed"]');

    // Verify only completed jobs are shown
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();

    for (let i = 0; i < count; i++) {
      const statusBadge = jobCards.nth(i).locator('[data-testid="job-status-badge"]');
      await expect(statusBadge).toHaveText('completed');
    }
  });

  test('should retry failed job', async ({ page }) => {
    // Create job that will fail
    const job = await createTestJob(
      page.request,
      {
        action: 'test_failure',
        platform: 'swiggy',
        payload: {},
      },
      authToken
    );

    // Navigate to job page
    await page.goto(`/jobs/${job.id}`);

    // Wait for job to fail
    await page.waitForSelector('[data-testid="job-status"][data-status="failed"]');

    // Click retry button
    await page.click('[data-testid="retry-job-button"]');

    // Wait for confirmation
    await page.waitForSelector('[data-testid="job-retried"]');

    // Verify new job was created
    const newJobId = await page.locator('[data-testid="new-job-id"]').textContent();
    expect(newJobId).toBeTruthy();
    expect(newJobId).not.toBe(job.id);
  });
});

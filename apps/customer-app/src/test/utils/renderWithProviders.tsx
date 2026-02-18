import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { mockStore, MockStoreState } from './mockStore';

/**
 * Custom render options extending RTL render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: MockStoreState;
  store?: ReturnType<typeof mockStore>;
  route?: string;
}

/**
 * Custom render function that wraps components with necessary providers
 * @param ui - React component to render
 * @param options - Render options including initial state and store
 * @returns Render result with store
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    initialState = {},
    store = mockStore(initialState),
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { store: ReturnType<typeof mockStore> } {
  // Set initial route if provided
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  /**
   * Wrapper component with all providers
   */
  function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
}

/**
 * Simplified render for components without routing
 * @param ui - React component to render
 * @param options - Render options
 * @returns Render result with store
 */
export function renderWithStore(
  ui: ReactElement,
  {
    initialState = {},
    store = mockStore(initialState),
    ...renderOptions
  }: Omit<CustomRenderOptions, 'route'> = {}
): RenderResult & { store: ReturnType<typeof mockStore> } {
  function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
}

/**
 * Helper to wait for loading states to complete
 * @param callback - Async callback that should complete
 * @param options - Wait options
 */
export async function waitForLoadingToFinish(
  callback: () => Promise<void> | void,
  options = { timeout: 3000 }
): Promise<void> {
  const startTime = Date.now();

  await callback();

  while (Date.now() - startTime < options.timeout) {
    const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
    if (loadingElements.length === 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

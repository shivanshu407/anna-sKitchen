import { beforeEach, afterEach, it, expect, vi } from 'vitest';

const { hydrate, render, create } = vi.hoisted(() => {
    const render = vi.fn();
    return { hydrate: vi.fn(), render, create: vi.fn(() => ({ render })) };
});
vi.mock('react-dom/client', () => ({ hydrateRoot: hydrate, createRoot: create }));
vi.mock('./App.jsx', () => ({ default: () => null }));
vi.mock('./components/SiteDataProvider.jsx', () => ({ default: () => null }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

it('lets the server-rendered document paint before starting hydration', async () => {
    const root = {};
    const frames = [];
    vi.stubGlobal('document', { getElementById: id => id === 'root' ? root : { textContent: '{"products":{},"blogs":[]}' } });
    vi.stubGlobal('requestAnimationFrame', callback => frames.push(callback));
    await import('./main.jsx');
    expect(hydrate).not.toHaveBeenCalled();
    frames.shift()();
    expect(hydrate).not.toHaveBeenCalled();
    frames.shift()();
    expect(hydrate).toHaveBeenCalledOnce();
    expect(hydrate.mock.calls[0][0]).toBe(root);
    expect(create).not.toHaveBeenCalled();
});

it('renders Vite development immediately when no server bootstrap exists', async () => {
    const root = {};
    vi.stubGlobal('document', { getElementById: id => id === 'root' ? root : null });
    await import('./main.jsx');
    expect(create).toHaveBeenCalledWith(root);
    expect(render).toHaveBeenCalledOnce();
    expect(hydrate).not.toHaveBeenCalled();
});

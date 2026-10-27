import { describe, it, expect, vi } from 'vitest';
import { startAutoScroll } from './auto-scroll';

function fixture(reduced = false) {
    const events = {};
    const element = { scrollWidth: 100, scrollLeft: 0, addEventListener: (name, callback) => { events[name] = callback; }, removeEventListener: vi.fn() };
    const frames = new Map();
    let id = 0, visible, resized, motionChange;
    const observers = [];
    const observer = callback => {
        const object = { observe: vi.fn(), disconnect: vi.fn() };
        observers.push(object);
        callback(object);
        return object;
    };
    const motion = { matches: reduced, addEventListener: (_, callback) => { motionChange = callback; }, removeEventListener: vi.fn() };
    const cleanup = startAutoScroll(element, {
        requestFrame: callback => { frames.set(++id, callback); return id; },
        cancelFrame: frame => frames.delete(frame), motion,
        observeVisibility: callback => observer(() => { visible = value => callback([{ isIntersecting: value }]); }),
        observeSize: callback => observer(() => { resized = callback; }),
    });
    const tick = () => { const [key, callback] = frames.entries().next().value; frames.delete(key); callback(); };
    return { element, frames, visible, resized, events, observers, cleanup, motion, motionChange, tick };
}

describe('visible-only logo animation', () => {
    it('does no animation work until visible and stops when scrolled offscreen', () => {
        const f = fixture();
        expect(f.frames.size).toBe(0);
        f.visible(true); f.tick();
        expect(f.element.scrollLeft).toBe(0.5);
        f.visible(false);
        expect(f.frames.size).toBe(0);
        f.cleanup();
    });
    it('honors reduced motion, including changes while the page is open', () => {
        const f = fixture(true); f.visible(true);
        expect(f.frames.size).toBe(0);
        f.motion.matches = false; f.motionChange();
        expect(f.frames.size).toBe(1);
        f.motion.matches = true; f.motionChange();
        expect(f.frames.size).toBe(0);
        f.cleanup();
    });
    it('pauses on hover without starting duplicate loops', () => {
        const f = fixture(); f.visible(true);
        f.events.mouseenter(); expect(f.frames.size).toBe(0);
        f.events.mouseleave(); f.events.mouseleave();
        expect(f.frames.size).toBe(1);
        f.cleanup();
    });
    it('wraps at the resized track limit and handles zero width', () => {
        const f = fixture(); f.element.scrollWidth = 2; f.resized(); f.visible(true);
        f.tick(); f.tick(); expect(f.element.scrollLeft).toBe(0);
        f.element.scrollWidth = 0; f.resized(); expect(f.frames.size).toBe(0);
        f.cleanup();
    });
    it('cleans up observers, listeners and the outstanding frame', () => {
        const f = fixture(); f.visible(true); f.cleanup();
        expect(f.frames.size).toBe(0);
        f.observers.forEach(observer => expect(observer.disconnect).toHaveBeenCalledOnce());
        expect(f.element.removeEventListener).toHaveBeenCalledTimes(2);
        expect(f.motion.removeEventListener).toHaveBeenCalledOnce();
    });
});

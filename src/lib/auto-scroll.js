export function startAutoScroll(element, options = {}) {
    if (!element) return () => {};
    const requestFrame = options.requestFrame || requestAnimationFrame;
    const cancelFrame = options.cancelFrame || cancelAnimationFrame;
    const motion = options.motion || window.matchMedia('(prefers-reduced-motion: reduce)');
    const observeVisibility = options.observeVisibility || (callback => new IntersectionObserver(callback));
    const observeSize = options.observeSize || (callback => new ResizeObserver(callback));
    let visible = false;
    let hovered = false;
    let frame;
    let limit = element.scrollWidth / 2;
    let position = element.scrollLeft;

    const stop = () => {
        if (frame !== undefined) cancelFrame(frame);
        frame = undefined;
    };
    const tick = () => {
        position = (position + 0.5) % limit;
        element.scrollLeft = position;
        frame = requestFrame(tick);
    };
    const update = () => {
        if (!visible || hovered || motion.matches || limit <= 0) stop();
        else if (frame === undefined) frame = requestFrame(tick);
    };
    const visibility = observeVisibility(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        update();
    });
    const size = observeSize(() => { limit = element.scrollWidth / 2; update(); });
    const enter = () => { hovered = true; update(); };
    const leave = () => { hovered = false; update(); };
    visibility.observe(element);
    size.observe(element);
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    motion.addEventListener('change', update);
    return () => {
        stop();
        visibility.disconnect();
        size.disconnect();
        element.removeEventListener('mouseenter', enter);
        element.removeEventListener('mouseleave', leave);
        motion.removeEventListener('change', update);
    };
}

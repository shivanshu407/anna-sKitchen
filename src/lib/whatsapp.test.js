import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    WHATSAPP_NUMBER,
    buildWhatsAppMessage,
    buildWhatsAppUrl,
    openWhatsApp,
} from './whatsapp';

describe('buildWhatsAppMessage', () => {
    it('lays the enquiry out as labelled lines under the intro', () => {
        const msg = buildWhatsAppMessage({
            intro: "Hi AK Sales, I'd like a quote.",
            fields: { Name: 'Ravi', 'Contact No.': '9876543210' },
        });

        expect(msg).toBe(
            "Hi AK Sales, I'd like a quote.\n\nName: Ravi\nContact No.: 9876543210"
        );
    });

    it('drops empty fields rather than sending blank lines', () => {
        const msg = buildWhatsAppMessage({
            fields: { Name: 'Ravi', Location: '', Budget: '   ', 'Contact No.': '98765' },
        });

        expect(msg).toBe('Name: Ravi\nContact No.: 98765');
    });

    it('treats an untouched select placeholder as empty', () => {
        // An unopened <select> still reports its first option, which must not be
        // sent to the business as if the customer had chosen it.
        const msg = buildWhatsAppMessage({
            fields: { Name: 'Ravi', 'Interested in': '-- Select Range --' },
        });

        expect(msg).toBe('Name: Ravi');
    });

    it('trims surrounding whitespace from values', () => {
        expect(buildWhatsAppMessage({ fields: { Name: '  Ravi  ' } })).toBe('Name: Ravi');
    });

    it('puts the free-text message in its own block', () => {
        const msg = buildWhatsAppMessage({
            fields: { Name: 'Ravi' },
            note: 'Need a tandoor for a 40-cover restaurant.',
        });

        expect(msg).toBe('Name: Ravi\n\nMessage:\nNeed a tandoor for a 40-cover restaurant.');
    });

    it('preserves the order the fields were given in', () => {
        const msg = buildWhatsAppMessage({
            fields: { Name: 'a', 'Contact No.': 'b', Location: 'c', Budget: 'd' },
        });

        expect(msg.split('\n')).toEqual(['Name: a', 'Contact No.: b', 'Location: c', 'Budget: d']);
    });

    it('returns an empty string when nothing was filled in', () => {
        expect(buildWhatsAppMessage()).toBe('');
        expect(buildWhatsAppMessage({ fields: { Name: '', Budget: '' } })).toBe('');
    });

    it('ignores non-string values instead of throwing', () => {
        const msg = buildWhatsAppMessage({ fields: { Name: 'Ravi', Qty: 5, Extra: null } });
        expect(msg).toBe('Name: Ravi');
    });
});

describe('buildWhatsAppUrl', () => {
    it('targets the business number by default', () => {
        expect(buildWhatsAppUrl({ fields: { Name: 'Ravi' } }))
            .toBe(`https://wa.me/${WHATSAPP_NUMBER}?text=Name%3A%20Ravi`);
    });

    it('percent-encodes newlines so WhatsApp keeps the line breaks', () => {
        const url = buildWhatsAppUrl({ fields: { Name: 'Ravi', Budget: '2 lakh' } });
        expect(url).toContain('%0A');
        expect(decodeURIComponent(url.split('?text=')[1])).toBe('Name: Ravi\nBudget: 2 lakh');
    });

    it('escapes characters that would otherwise break the URL', () => {
        const url = buildWhatsAppUrl({ fields: { Name: 'A&B #1', Note: 'a?b=c' } });
        // Nothing after ?text= may be read as another query parameter.
        expect(url.split('?text=')[1]).not.toMatch(/[&#?]/);
    });

    it('accepts an override number', () => {
        expect(buildWhatsAppUrl({ number: '910000000000', fields: { Name: 'Ravi' } }))
            .toContain('wa.me/910000000000');
    });
});

describe('openWhatsApp', () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    it('opens a new tab so the visitor does not lose the site', () => {
        const open = vi.fn(() => ({}));
        vi.stubGlobal('window', { open, location: { href: '' } });

        openWhatsApp({ fields: { Name: 'Ravi' } });

        expect(open).toHaveBeenCalledWith(
            expect.stringContaining('wa.me'), '_blank', 'noopener,noreferrer'
        );
    });

    it('falls back to the current tab when a popup blocker returns null', () => {
        // Silently doing nothing would recreate the exact bug being fixed.
        const location = { href: '' };
        vi.stubGlobal('window', { open: vi.fn(() => null), location });

        openWhatsApp({ fields: { Name: 'Ravi' } });

        expect(location.href).toContain('wa.me');
    });
});

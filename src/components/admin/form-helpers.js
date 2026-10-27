// Non-component helpers shared by the admin editors.

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

// Returns an error message, or '' when the file can be uploaded.
export const imageFileError = (file) => {
    if (!IMAGE_TYPES.includes(file.type)) return 'Images must be JPEG, PNG, WebP or AVIF files.';
    if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller.';
    return '';
};

// FAQs with both a question and an answer, trimmed.
export const completeFaqs = (faqs) => faqs
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
    .filter((faq) => faq.question && faq.answer);

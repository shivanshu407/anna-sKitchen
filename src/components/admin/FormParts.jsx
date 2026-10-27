import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

// Form styling and small building blocks shared by the admin editors.

export const inputClass = 'w-full px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white placeholder-gray-500 transition-all font-medium';
export const fileInputClass = `${inputClass} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-accent file:text-secondary hover:file:bg-white cursor-pointer`;
export const labelClass = 'block text-sm font-medium text-gray-300 mb-2';
export const hintClass = 'text-xs text-gray-400 mt-2';
export const cardClass = 'bg-secondary/20 border border-white/5 rounded-2xl p-6 space-y-6';
const buttonBase = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
export const primaryButton = `${buttonBase} bg-accent text-secondary hover:bg-white shadow-lg`;
export const ghostButton = `${buttonBase} border border-white/15 text-gray-200 hover:bg-white/10`;
export const smallGhostButton = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-white/15 text-gray-200 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export const Counter = ({ value, range, max, unit = '' }) => {
    const [min, upper] = range || [0, max];
    const out = value > upper || (range && value > 0 && value < min);
    return (
        <span className={`text-xs font-medium tabular-nums ${out ? 'text-amber-300' : 'text-gray-400'}`}>
            {value}{unit}{range ? ` (aim ${min}–${upper})` : ` / ${upper}`}
        </span>
    );
};

export const FieldLabel = ({ htmlFor, children, counter }) => (
    <div className="flex items-end justify-between gap-4 mb-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-300">{children}</label>
        {counter}
    </div>
);

export const Section = ({ title, children }) => (
    <section className={cardClass}>
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3">{title}</h3>
        {children}
    </section>
);

/** Editable list of { question, answer } pairs. */
export const FaqFields = ({ faqs, onChange, emptyHint, questionPlaceholder, answerPlaceholder }) => {
    const setFaq = (index, field, value) => onChange(faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)));
    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-sm font-medium text-gray-300">FAQs</p>
                <button type="button" onClick={() => onChange([...faqs, { question: '', answer: '' }])} className={smallGhostButton}>
                    <FaPlus aria-hidden="true" /> Add question
                </button>
            </div>
            {faqs.length === 0 && <p className="text-sm text-gray-500 italic">{emptyHint}</p>}
            <div className="space-y-4">
                {faqs.map((faq, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-accent">Question {index + 1}</span>
                            <button type="button" onClick={() => onChange(faqs.filter((_, i) => i !== index))} aria-label={`Remove question ${index + 1}`} title="Remove question" className="text-gray-400 hover:text-red-300 p-1">
                                <FaTrash className="text-xs" aria-hidden="true" />
                            </button>
                        </div>
                        <input type="text" aria-label={`Question ${index + 1}`} value={faq.question} maxLength={300} onChange={(e) => setFaq(index, 'question', e.target.value)} className={inputClass} placeholder={questionPlaceholder} />
                        <textarea aria-label={`Answer ${index + 1}`} rows={3} value={faq.answer} maxLength={2000} onChange={(e) => setFaq(index, 'answer', e.target.value)} className={`${inputClass} resize-y`} placeholder={answerPlaceholder} />
                    </div>
                ))}
            </div>
        </div>
    );
};

/** Lists server or validation messages after a failed save. */
export const ErrorList = ({ title, errors }) => (errors.length > 0 && (
    <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
        <p className="font-bold mb-2">{title}</p>
        <ul className="list-disc pl-5 space-y-1">
            {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>
    </div>
));

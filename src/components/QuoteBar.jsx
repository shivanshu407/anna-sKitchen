import { useState } from 'react';
import { openWhatsApp } from '../lib/whatsapp';

const RANGES = ['Heating Range', 'Refrigeration', 'Bakery Products', 'Processing'];
const EMPTY = { name: '', contact: '', location: '', budget: '', range: '' };

/**
 * The "Get Quote" bar shown on About, Contact, Services, Projects and Product
 * Detail. It previously existed as five identical copies of dead markup — no
 * submit handler, so clicking reloaded the page and discarded the enquiry.
 *
 * Submitting now opens WhatsApp with the details filled in.
 */
const QuoteBar = () => {
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');

    const update = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (error) setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Name and a contact number are the minimum needed to call someone back.
        if (!form.name.trim() || !form.contact.trim()) {
            setError('Please enter your name and contact number.');
            return;
        }

        openWhatsApp({
            intro: "Hi AK Sales, I'd like a quote.",
            fields: {
                Name: form.name,
                'Contact No.': form.contact,
                Location: form.location,
                Budget: form.budget,
                'Interested in': form.range,
            },
        });
    };

    const inputClass =
        'flex-1 min-w-[100px] text-sm py-2 px-3 outline-none bg-transparent border-r border-gray-200';

    return (
        <div>
            <form
                onSubmit={handleSubmit}
                className="flex flex-wrap items-center gap-3 bg-white rounded-3xl sm:rounded-full shadow-lg border border-gray-100 p-4 sm:p-2 pl-4 sm:pl-6 sm:ps-10"
            >
                <input
                    type="text"
                    placeholder="Name"
                    aria-label="Name"
                    value={form.name}
                    onChange={update('name')}
                    className={inputClass}
                />
                <input
                    type="tel"
                    placeholder="Contact No."
                    aria-label="Contact number"
                    value={form.contact}
                    onChange={update('contact')}
                    className={inputClass}
                />
                <input
                    type="text"
                    placeholder="Location"
                    aria-label="Location"
                    value={form.location}
                    onChange={update('location')}
                    className={inputClass}
                />
                <input
                    type="text"
                    placeholder="Your Budget"
                    aria-label="Your budget"
                    value={form.budget}
                    onChange={update('budget')}
                    className={inputClass}
                />
                <select
                    aria-label="Interested in"
                    value={form.range}
                    onChange={update('range')}
                    className="text-sm py-2 px-3 outline-none bg-transparent text-gray-500"
                >
                    <option value="">-- Select Range --</option>
                    {RANGES.map((range) => (
                        <option key={range} value={range}>{range}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                >
                    Get Quote
                </button>
            </form>

            {error && (
                <p role="alert" className="text-sm text-red-600 mt-3 text-center">
                    {error}
                </p>
            )}
        </div>
    );
};

export default QuoteBar;

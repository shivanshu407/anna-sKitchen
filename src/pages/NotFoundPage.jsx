import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <main className="min-h-[60vh] bg-secondary flex flex-col items-center justify-center text-white px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Page not found</h1>
            <p className="mb-6">The page you requested could not be found.</p>
            <Link className="text-accent underline" to="/collections">Browse kitchen equipment</Link>
        </main>
    );
}

import { useEffect, useState } from 'react';
import { SiteDataContext, fallbackData } from '../lib/site-data';
import { fetchProducts } from '../api/products';
import { fetchBlogs } from '../api/blogs';

export default function SiteDataProvider({ initialData, children }) {
    const [data, setData] = useState(initialData || fallbackData);
    useEffect(() => {
        if (initialData) return;
        let active = true;
        Promise.all([fetchProducts(), fetchBlogs()]).then(([products, blogs]) => {
            if (active) setData({ products, blogs });
        });
        return () => { active = false; };
    }, [initialData]);
    return <SiteDataContext.Provider value={{ ...data, loading: false }}>{children}</SiteDataContext.Provider>;
}

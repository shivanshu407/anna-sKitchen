import { createContext, useContext } from 'react';
import products from '../data/productsData';
import blogs from '../data/blogsData';

export const fallbackData = { products, blogs };
export const SiteDataContext = createContext({ ...fallbackData, loading: false });
export const useSiteData = () => useContext(SiteDataContext);

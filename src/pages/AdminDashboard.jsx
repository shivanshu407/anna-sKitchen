import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProducts, addProduct, deleteProduct } from '../api/products';
import { fetchAllBlogsAdmin, deleteBlog } from '../api/blogs';
import { logout } from '../api/auth';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';

// TipTap is admin-only, so the editor is split out of the public bundle.
const BlogEditor = lazy(() => import('../components/admin/BlogEditor'));

const blogDate = (blog) => {
    const date = blog.publishedAt ? new Date(blog.publishedAt) : null;
    if (date && !Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
    }
    return blog.date || 'Not published yet';
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('manage-products');
    const [productsData, setProductsData] = useState({});
    const [blogsData, setBlogsData] = useState([]);
    const [blogsError, setBlogsError] = useState('');
    // null shows the post list; { blog: null } a new post; { blog } an edit.
    const [blogEditor, setBlogEditor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Product States
    const [selectedCategory, setSelectedCategory] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [productName, setProductName] = useState('');
    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    const [successMessage, setSuccessMessage] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
        } finally {
            // Even if the request fails, send the admin to the login page; the
            // guard re-checks the session there anyway.
            navigate('/admin/login', { replace: true });
        }
    };

    // Fetch data from API on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData] = await Promise.all([
                fetchProducts(),
                loadBlogs()
            ]);

            setProductsData(pData);

            const keys = Object.keys(pData);
            if (keys.length > 0) {
                if (!filterCategory || !pData[filterCategory]) setFilterCategory(keys[0]);
                if (!selectedCategory || !pData[selectedCategory]) setSelectedCategory(keys[0]);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    // The admin list includes drafts and has no bundled fallback, so a failure is shown.
    const loadBlogs = async () => {
        try {
            setBlogsData(await fetchAllBlogsAdmin());
            setBlogsError('');
        } catch (err) {
            setBlogsError(`Could not load blog posts: ${err.message}`);
        }
    };

    // Kept loadProducts wrapper for reuse inside handler
    const loadProducts = async () => {
        await loadData();
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (!productName || !productImage) {
            alert("Please fill in both name and image URL.");
            return;
        }

        if (selectedCategory === 'new-category' && !newCategoryName) {
            alert("Please provide a name for the new category.");
            return;
        }

        let categorySlug = selectedCategory;
        let categoryTitle = productsData[selectedCategory]?.title;

        if (selectedCategory === 'new-category') {
            categorySlug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            categoryTitle = newCategoryName;
        }

        try {
            const result = await addProduct({
                categorySlug,
                categoryTitle,
                categoryDescription: productsData[categorySlug]?.description || 'Newly added category.',
                productName,
                productImage
            });

            setSuccessMessage(result.message || `Successfully added "${productName}"!`);
            setProductName('');
            setProductImage(null);
            setImagePreview('');
            setNewCategoryName('');

            // Refresh product list from database
            await loadProducts();
            if (selectedCategory === 'new-category') {
                setSelectedCategory(categorySlug);
            }
        } catch (err) {
            alert('Error adding product: ' + err.message);
        }

        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleDeleteProduct = async (categoryKey, productIndex) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteProduct(categoryKey, productIndex);
                setSuccessMessage("Product deleted successfully.");
                await loadProducts();
            } catch (err) {
                alert('Error deleting product: ' + err.message);
            }
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleBlogSaved = async (message) => {
        setBlogEditor(null);
        setSuccessMessage(message);
        await loadBlogs();
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleDeleteBlog = async (slug) => {
        if (window.confirm("Are you sure you want to delete this blog?")) {
            try {
                await deleteBlog(slug);
                setSuccessMessage("Blog deleted successfully.");
                await loadBlogs();
            } catch (err) {
                setBlogsError('Error deleting blog: ' + err.message);
            }
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const blogCategories = [...new Set(blogsData.map((blog) => blog.category).filter(Boolean))].sort();

    if (loading) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading products from database...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary flex">
            {/* Sidebar */}
            <aside className="w-64 bg-secondary/40 backdrop-blur-md border-r border-white/5 text-white hidden md:block shadow-2xl relative z-10">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-2xl font-bold font-heading text-accent">Admin Panel</h2>
                    <p className="text-sm text-gray-400 mt-1">AK Sales</p>
                </div>
                <nav className="mt-6 flex flex-col gap-2 px-4">
                    <button
                        onClick={() => setActiveTab('manage-products')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'manage-products' ? 'bg-accent/10 text-accent border border-accent/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span className="font-medium">Manage Products</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'products' ? 'bg-accent/10 text-accent border border-accent/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span className="font-medium">Add Product</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('blogs')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'blogs' ? 'bg-accent/10 text-accent border border-accent/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span className="font-medium">Manage Blogs</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex items-center justify-center px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 absolute bottom-20 w-[calc(100%-2rem)] border border-white/10 hover:border-red-400/30 disabled:opacity-60"
                    >
                        <span className="font-medium">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
                    </button>
                    <Link to="/" className="flex items-center justify-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300 mt-auto absolute bottom-6 w-[calc(100%-2rem)] border border-white/10 group">
                        <span className="font-medium group-hover:-translate-x-1 transition-transform">←</span>
                        <span className="font-medium ml-2">Back to Website</span>
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-8 text-gray-300 relative">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

                <header className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {activeTab === 'manage-products' && 'Manage Products'}
                            {activeTab === 'products' && 'Add New Product'}
                            {activeTab === 'blogs' && 'Manage Blogs'}
                        </h1>
                        <p className="text-gray-400 mt-2">
                            {activeTab === 'manage-products' && 'View, edit, or delete existing equipment in your catalog.'}
                            {activeTab === 'products' && 'Add new equipment to your catalog.'}
                            {activeTab === 'blogs' && 'Write, edit and publish articles, or keep them as drafts.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent/20 border border-accent/50 text-accent rounded-full flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                            A
                        </div>
                    </div>
                </header>

                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8 relative z-10 w-full`}>
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                        {activeTab === 'manage-products' && 'Current Product Catalog'}
                        {activeTab === 'products' && 'Add New Product Form'}
                        {activeTab === 'blogs' && (blogEditor ? (blogEditor.blog ? 'Edit Blog Post' : 'New Blog Post') : 'Blog Posts')}
                    </h2>

                    {successMessage && (
                        <div className="mb-6 bg-accent/10 border border-accent/30 text-accent px-4 py-3 rounded-xl relative shadow-[0_0_15px_rgba(212,175,55,0.1)]" role="alert">
                            <span className="block sm:inline font-medium">{successMessage}</span>
                        </div>
                    )}

                    {activeTab === 'manage-products' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Filters Bar */}
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-secondary/20 p-4 rounded-xl border border-white/5">
                                <div className="w-full md:w-1/2">
                                    <input
                                        type="text"
                                        placeholder="Search products by name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white placeholder-gray-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-400 whitespace-nowrap">
                                        Category:
                                    </label>
                                    <select
                                        id="categoryFilter"
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="w-full md:w-auto px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white font-medium uppercase transition-all"
                                    >
                                        {Object.entries(productsData).map(([key, data]) => (
                                            <option key={key} value={key}>
                                                {data.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {Object.entries(productsData)
                                .filter(([categorySlug]) => categorySlug === filterCategory)
                                .map(([categorySlug, categoryData]) => {
                                    const filteredProducts = categoryData.products.filter(product =>
                                        product.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    );

                                    if (searchQuery && filteredProducts.length === 0) return null;

                                    return (
                                        <div key={categorySlug} className="bg-secondary/20 p-6 rounded-2xl border border-white/5">
                                            <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex justify-between items-center">
                                                {categoryData.title}
                                                <span className="text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full">{filteredProducts.length} Items</span>
                                            </h3>

                                            {filteredProducts.length === 0 ? (
                                                <p className="text-gray-500 text-sm italic py-4">No products found in this category.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                    {filteredProducts.map((product) => {
                                                        const originalIndex = categoryData.products.findIndex(p => p.name === product.name);
                                                        return (
                                                            <div key={originalIndex} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-3 flex flex-col group hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:border-accent/40 transition-all duration-500 relative">
                                                                <button
                                                                    onClick={() => handleDeleteProduct(categorySlug, originalIndex)}
                                                                    className="absolute top-5 right-5 bg-red-500/90 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg backdrop-blur-sm"
                                                                    title="Delete Product"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>

                                                                <div className="aspect-[4/3] bg-white rounded-xl p-4 relative flex items-center justify-center overflow-hidden border border-white/20 shadow-inner">
                                                                    <img
                                                                        src={product.image}
                                                                        alt={product.name}
                                                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 drop-shadow-md"
                                                                        onError={(e) => { e.target.src = '/images/ak-sales-logo.png' }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"></div>
                                                                </div>
                                                                <div className="pt-4 pb-2 px-2 flex-1 flex flex-col justify-between text-center">
                                                                    <h4 className="font-bold text-sm md:text-base text-white/90 line-clamp-2 group-hover:text-accent tracking-wide transition-colors" title={product.name}>
                                                                        {product.name}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="flex flex-col lg:flex-row gap-12 animate-fadeIn">
                            <form onSubmit={handleAddProduct} className="space-y-6 lg:w-1/2">
                                {/* Category Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Select Category
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white font-medium uppercase transition-all"
                                    >
                                        {Object.entries(productsData).map(([key, data]) => (
                                            <option key={key} value={key}>
                                                {data.title}
                                            </option>
                                        ))}
                                        <option value="new-category" className="bg-accent/20 text-accent font-bold">
                                            + ADD NEW CATEGORY
                                        </option>
                                    </select>
                                </div>

                                {/* New Category Name (Conditional) */}
                                {selectedCategory === 'new-category' && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-sm font-medium text-accent mb-2">
                                            New Category Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            className="w-full px-4 py-3 border border-accent/40 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.1)] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-accent/5 text-white placeholder-accent/30 transition-all font-medium"
                                            placeholder="e.g. Ovens & Grills"
                                        />
                                    </div>
                                )}

                                {/* Product Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Product Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        className="w-full px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white placeholder-gray-500 transition-all font-medium"
                                        placeholder="e.g. Commercial Pizza Oven"
                                    />
                                </div>

                                {/* Product Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Product Image File
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        required
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            setProductImage(file);
                                            setImagePreview(file ? URL.createObjectURL(file) : '');
                                        }}
                                        className="w-full px-4 py-3 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-secondary/40 text-white transition-all font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-accent file:text-secondary hover:file:bg-white cursor-pointer"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Select an image file from your device. It will be uploaded to Cloudinary safely.
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-secondary bg-accent hover:bg-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(212,175,55,0.3)]"
                                    >
                                        {selectedCategory === 'new-category' ? 'Create Category & Add Product' : 'Add Product to Catalog'}
                                    </button>
                                </div>
                            </form>

                            <div className="lg:w-1/2">
                                <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
                                    Live Preview
                                </h3>
                                <div className="max-w-[280px] mx-auto">
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-3 flex flex-col group hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:border-accent/40 transition-all duration-500 relative">
                                        <div className="aspect-[4/3] bg-white rounded-xl p-4 relative flex items-center justify-center overflow-hidden border border-white/20 shadow-inner">
                                            <img
                                                src={imagePreview || '/images/ak-sales-logo.png'}
                                                alt={productName || 'Product Preview'}
                                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 drop-shadow-md"
                                                onError={(e) => { e.target.src = '/images/ak-sales-logo.png' }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"></div>
                                        </div>
                                        <div className="pt-4 pb-2 px-2 flex-1 flex flex-col justify-between text-center">
                                            <h4 className="font-bold text-sm md:text-base text-white/90 line-clamp-2 group-hover:text-accent tracking-wide transition-colors" title={productName || 'Product Preview'}>
                                                {productName || 'Enter a product name'}
                                            </h4>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-6 text-center italic">
                                        This is how your product will appear in the catalog.
                                        Ensure the image fits well within the aspect ratio.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'blogs' && blogEditor && (
                        <Suspense fallback={
                            <div className="py-16 text-center">
                                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading the editor…</p>
                            </div>
                        }>
                            <BlogEditor
                                key={blogEditor.blog?.slug || 'new'}
                                blog={blogEditor.blog}
                                categories={blogCategories}
                                onSaved={handleBlogSaved}
                                onCancel={() => setBlogEditor(null)}
                            />
                        </Suspense>
                    )}

                    {activeTab === 'blogs' && !blogEditor && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <p className="text-sm text-gray-400">
                                    {blogsData.length} {blogsData.length === 1 ? 'post' : 'posts'}, including drafts.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setBlogEditor({ blog: null })}
                                    className="inline-flex items-center gap-2 py-3 px-5 rounded-xl shadow-lg text-sm font-bold text-secondary bg-accent hover:bg-white transition-all duration-300"
                                >
                                    <FaPlus aria-hidden="true" /> New post
                                </button>
                            </div>

                            {blogsError && (
                                <div className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3" role="alert">
                                    <span>{blogsError}</span>
                                    <button type="button" onClick={loadBlogs} className="text-sm font-bold underline hover:text-white">Try again</button>
                                </div>
                            )}

                            {blogsData.length === 0 ? (
                                !blogsError && <p className="text-gray-500 text-sm italic py-4">No blog posts yet. Start with "New post".</p>
                            ) : (
                                <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-secondary/20">
                                    {blogsData.map((blog) => {
                                        const isDraft = blog.status === 'draft';
                                        return (
                                            <li key={blog.slug} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                                                <div className="w-full sm:w-32 aspect-video shrink-0 bg-secondary/50 overflow-hidden rounded-xl border border-white/10">
                                                    {blog.image ? (
                                                        <img
                                                            src={blog.image}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.src = '/images/ak-sales-logo.png' }}
                                                        />
                                                    ) : (
                                                        <span className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isDraft ? 'text-amber-200 bg-amber-400/10 border-amber-300/30' : 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30'}`}>
                                                            {isDraft ? 'Draft' : 'Published'}
                                                        </span>
                                                        {blog.category && <span className="text-[10px] text-accent font-bold uppercase tracking-wider">{blog.category}</span>}
                                                    </div>
                                                    <h4 className="font-bold text-white/90 leading-snug line-clamp-2">{blog.title || 'Untitled post'}</h4>
                                                    <p className="text-xs text-white/50 font-medium mt-1">
                                                        {blogDate(blog)}{blog.author ? ` · ${blog.author}` : ''}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setBlogEditor({ blog })}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-white/15 text-gray-200 hover:bg-white/10 hover:text-accent transition-colors"
                                                        aria-label={`Edit "${blog.title}"`}
                                                    >
                                                        <FaEdit aria-hidden="true" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteBlog(blog.slug)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-colors"
                                                        aria-label={`Delete "${blog.title}"`}
                                                    >
                                                        <FaTrash className="text-xs" aria-hidden="true" /> Delete
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

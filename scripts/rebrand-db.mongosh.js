// Renames "Anna Kitchen Equipments" to "AK Sales" in the text stored in MongoDB.
//
// The website's own text was changed in code, but category descriptions, product
// names and blog posts live in the database and have to be changed there.
// As of 2026-09-29 exactly one field needs it: the Bakery Products description.
//
// HOW TO RUN
//   1. Leave APPLY as false and run it once. It only PRINTS what it would change.
//   2. Check the output looks right.
//   3. Set APPLY to true, run it again. Now it saves.
//
//   mongosh "<your-connection-string>" --file rebrand-db.mongosh.js
//
// Safe to run more than once — a second run finds nothing left to change.

const APPLY = false;   // <-- change to true for the real run

// Longest phrasing first, so "Anna's Kitchen Equipments" is not half-replaced by
// the shorter "Anna's Kitchen" rule. Case-sensitive: the lowercase email address
// and Instagram handle are deliberately left alone.
const RULES = [
    ["Anna's Kitchen Equipment's", 'AK Sales'],
    ["Anna's Kitchen Equipments", 'AK Sales'],
    ['Anna Kitchen Equipments', 'AK Sales'],
    ['Anna Kitchen Equipment', 'AK Sales'],
    ["Anna's Kitchen", 'AK Sales'],
    ['Anna Kitchen', 'AK Sales'],
];

const rebrand = (text) => {
    if (typeof text !== 'string') return text;
    return RULES.reduce((s, [from, to]) => s.split(from).join(to), text);
};

let changes = 0;
const show = (where, before, after) => {
    changes++;
    print('  ' + where);
    print('    before: ' + before.slice(0, 110));
    print('    after:  ' + after.slice(0, 110));
};

print(APPLY ? '=== APPLYING CHANGES ===' : '=== DRY RUN — nothing will be saved ===');
print('');

// --- categories: title, description, product names ------------------------
db.categories.find({}).forEach((cat) => {
    const set = {};

    ['title', 'description'].forEach((field) => {
        const next = rebrand(cat[field]);
        if (next !== cat[field]) { show(cat.slug + '.' + field, cat[field], next); set[field] = next; }
    });

    let productsChanged = false;
    const products = (cat.products || []).map((p) => {
        const name = rebrand(p.name);
        if (name === p.name) return p;
        show(cat.slug + ' product', p.name, name);
        productsChanged = true;
        return Object.assign({}, p, { name: name });
    });
    if (productsChanged) set.products = products;

    if (APPLY && Object.keys(set).length) db.categories.updateOne({ _id: cat._id }, { $set: set });
});

// --- blogs: title, author, and every content block --------------------------
db.blogs.find({}).forEach((blog) => {
    const set = {};

    ['title', 'author', 'category'].forEach((field) => {
        const next = rebrand(blog[field]);
        if (next !== blog[field]) { show('blog ' + blog.slug + '.' + field, blog[field], next); set[field] = next; }
    });

    if (Array.isArray(blog.content)) {
        let contentChanged = false;
        const content = blog.content.map((block) => {
            const heading = rebrand(block.heading);
            const text = rebrand(block.text);
            if (heading === block.heading && text === block.text) return block;
            if (heading !== block.heading) show('blog ' + blog.slug + ' heading', block.heading, heading);
            if (text !== block.text) show('blog ' + blog.slug + ' text', block.text, text);
            contentChanged = true;
            return Object.assign({}, block, { heading: heading, text: text });
        });
        if (contentChanged) set.content = content;
    }

    if (APPLY && Object.keys(set).length) db.blogs.updateOne({ _id: blog._id }, { $set: set });
});

print('');
print((APPLY ? '  changed: ' : '  would change: ') + changes);
if (!APPLY) print('\n  Nothing was saved. Set APPLY = true at the top and run again.');

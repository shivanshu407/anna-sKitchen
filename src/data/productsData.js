// All product categories and their items for AK Sales

const defaultProductsData = {
    'bakery-products': {
        title: 'BAKERY PRODUCTS',
        slug: 'bakery-products',
        description:
            "Exceptional Baking Starts With The Right Tools. At AK Sales, We Provide High-Quality Bakery Equipment For Professional And Home Bakers, Ensuring Consistent, Delicious Results.",
        products: [
            { name: 'Bengali Sweet Counter', image: '/images/bakery-product/bengali-sweet-counter.webp' },
            { name: 'Bread Oven', image: '/images/bakery-product/bread-oven.webp' },
            { name: 'Bread Slice Cutter', image: '/images/bakery-product/bread-slice-cutter.webp' },
            { name: 'Cold Display Counter', image: '/images/bakery-product/cold-display-counter.webp' },
            { name: 'Spiral Mixer Machine', image: '/images/bakery-product/spiral-mixer-machine.webp' },
            { name: 'Square Display Counter', image: '/images/bakery-product/square-display-counter.webp' },
        ],
    },
    refrigeration: {
        title: 'REFRIGERATION',
        slug: 'refrigeration',
        description:
            'Keep Your Ingredients Fresh And Your Kitchen Running Smoothly With Our Premium Refrigeration Equipment. Designed For Heavy-Duty Commercial Use, Our Range Delivers Consistently Low Temperatures And Maximum Efficiency.',
        products: [
            { name: 'Cold Bain Marie', image: '/images/refrigeration/cold-bain-marie.webp' },
            { name: 'Double Top Door Chest Deep Freezer', image: '/images/refrigeration/double-top-door-chest-deep-freezer.webp' },
            { name: 'Four Door Refrigerator', image: '/images/refrigeration/four-door-refrigerator.webp' },
            { name: 'Ice Cube Machine', image: '/images/refrigeration/ice-cube-machine.webp' },
            { name: 'Pizza Makeline', image: '/images/refrigeration/pizza-makeline.webp' },
            { name: 'Softy Machine', image: '/images/refrigeration/softy-machine.webp' },
            { name: 'Table Top Refrigerator', image: '/images/refrigeration/table-top-refrigerator.webp' },
            { name: 'Two Door Refrigerator', image: '/images/refrigeration/two-door-refrigerator.webp' },
            { name: 'Upright Beverage Coolers', image: '/images/refrigeration/upright-beverage-coolers.webp' },
            { name: 'Water Cooler', image: '/images/refrigeration/water-cooler.webp' },
        ],
    },
    'heating-range': {
        title: 'HEATING RANGE',
        slug: 'heating-range',
        description:
            'Power Your Kitchen With Our Robust Heating Range Equipment. From Commercial Burners To Tandoors, Our Heating Solutions Are Built For High-Performance Cooking In Demanding Kitchen Environments.',
        products: [
            { name: 'Dosa Bhatti', image: '/images/heating-range/dosa-bhatti.webp' },
            { name: 'Drum Tandoor', image: '/images/heating-range/drum-tandoor.webp' },
            { name: 'Hot Bain Marie', image: '/images/heating-range/hot-bain-marie.webp' },
            { name: 'Kadai Fryer', image: '/images/heating-range/kadai-fryer.webp' },
            { name: 'Roti Puffer', image: '/images/heating-range/roti-puffer.webp' },
            { name: 'Single Burner Gas Range', image: '/images/heating-range/single-burner-gas-range.webp' },
            { name: 'Tank Tandoor', image: '/images/heating-range/tank-tandoor.webp' },
            { name: 'Three Burner Chinese Gas', image: '/images/heating-range/three-burner-chinese-gas.webp' },
            { name: 'Three Burner Indian Gas', image: '/images/heating-range/three-burner-indian-gas.webp' },
            { name: 'Two Burner Indian', image: '/images/heating-range/two-burner-indian.webp' },
        ],
    },
    'chat-and-fast-food-counter': {
        title: 'CHAT & FAST FOOD COUNTER',
        slug: 'chat-and-fast-food-counter',
        description:
            'Serve Your Customers Efficiently With Our Sleek And Durable Chat & Fast Food Counters. Designed For Quick Service, These Counters Offer Ample Space, Easy Access, And Hygienic Surfaces, Perfect For Fast-Paced Environments.',
        products: [
            { name: 'Chaat Counter - 1', image: '/images/chaat-and-fast-food-counter/chaat-counter-1.webp' },
            { name: 'Chaat Counter - 2', image: '/images/chaat-and-fast-food-counter/chaat-counter-2.webp' },
            { name: 'Pani Puri Counter', image: '/images/chaat-and-fast-food-counter/pani-puri-counter.webp' },
            { name: 'Pav Bhaji Counter', image: '/images/chaat-and-fast-food-counter/pav-bhaji-counter.webp' },
        ],
    },
    'work-and-profession-table': {
        title: 'WORK & PROFESSION TABLE',
        slug: 'work-and-profession-table',
        description:
            'Optimize Your Kitchen Workflow With Our Sturdy And Spacious Work & Profession Tables. Built For Durability And Ease Of Use, They Provide The Perfect Surface For Food Prep And Professional Tasks In Busy Kitchens.',
        products: [
            { name: 'Cash Drawer', image: '/images/work-and-professyion-table/cash-drawer.webp' },
            { name: 'Drawer With Storage Table', image: '/images/work-and-professyion-table/drawer-with-storage-table.webp' },
            { name: 'Pick Up Counter', image: '/images/work-and-professyion-table/pick-up-counter.webp' },
            { name: 'Restaurant Table', image: '/images/work-and-professyion-table/restaurant-table.webp' },
            { name: 'Service Table', image: '/images/work-and-professyion-table/service-table.webp' },
            { name: 'Single Sink', image: '/images/work-and-professyion-table/single-sink.webp' },
            { name: 'Sink With Table', image: '/images/work-and-professyion-table/sink-with-table.webp' },
            { name: 'Three Sinks Table', image: '/images/work-and-professyion-table/three-sinks-table.webp' },
            { name: 'Three Step Work', image: '/images/work-and-professyion-table/three-step-work.webp' },
            { name: 'Work Table With Drawer', image: '/images/work-and-professyion-table/work-table-with-drawer.webp' },
            { name: 'Work Table', image: '/images/work-and-professyion-table/work-table.webp' },
            { name: 'Work With Storage Table', image: '/images/work-and-professyion-table/work-with-storage-table.webp' },
        ],
    },
    'rack-trolley': {
        title: 'RACK TROLLEY',
        slug: 'rack-trolley',
        description:
            'Easily Transport And Organize Your Baked Goods With Our Durable And Versatile Rack Trolleys. Designed For Efficiency, These Trolleys Offer Smooth Mobility And Ample Storage, Perfect For Busy Kitchen Environments.',
        products: [
            { name: 'Dish Rack', image: '/images/rack-trolley/dish-rack.webp' },
            { name: 'Masala Trolley', image: '/images/rack-trolley/masala-trolley.webp' },
            { name: 'Pipe Pot Rack', image: '/images/rack-trolley/pipe-pot-rack.webp' },
            { name: 'Service Trolley', image: '/images/rack-trolley/service-trolley.webp' },
            { name: 'Storage Rack', image: '/images/rack-trolley/storage-rack.webp' },
            { name: 'Tray Slide Trolley', image: '/images/rack-trolley/tray-slide-trolley.webp' },
        ],
    },
    processing: {
        title: 'PROCESSING',
        slug: 'processing',
        description:
            'Enhance Your Kitchen Efficiency With Our Advanced Processing Equipment. Designed For Precision And Speed, Our Range Of Tools Ensures Smooth And Consistent Preparation, Ideal For Professional Kitchens And Large-Scale Production.',
        products: [
            { name: 'Coffee Beans Grinder', image: '/images/processing/coffee-beans-grinder.webp' },
            { name: 'Coffee Machine', image: '/images/processing/coffee-machine.webp' },
            { name: 'Grilled Machine', image: '/images/processing/grilled-machine.webp' },
            { name: 'Heavy Duty Exhaust Fan', image: '/images/processing/heavy-duty-exhaust-fan.webp' },
            { name: 'Ice Blender', image: '/images/processing/ice-blender.webp' },
            { name: 'Idli Steamer', image: '/images/processing/idli-steamer.webp' },
            { name: 'Meat Mincer', image: '/images/processing/meat-mincer.webp' },
            { name: 'Pizza Gas Oven', image: '/images/processing/pizza-gas-oven.webp' },
            { name: 'Pizza Oven', image: '/images/processing/pizza-oven.webp' },
            { name: 'Plate Induction Stove', image: '/images/processing/plate-induction-stove.webp' },
            { name: 'Plate Warmer', image: '/images/processing/plate-warmer.webp' },
            { name: 'Pulveriser', image: '/images/processing/pulveriser.webp' },
            { name: 'Wet Grinder', image: '/images/processing/wet-grinder.webp' },
        ],
    },
    'hotel-and-restaurant': {
        title: 'HOTEL & RESTAURANT',
        slug: 'hotel-and-restaurant',
        description:
            'Complete Kitchen Solutions For Hotels And Restaurants. From Heavy-Duty Cooking Equipment To Elegant Serving Stations, We Provide Everything You Need To Run A Professional Hospitality Kitchen.',
        products: [],
    },
    'cafe-and-bakery-kitchen': {
        title: 'CAFE & BAKERY KITCHEN',
        slug: 'cafe-and-bakery-kitchen',
        description:
            'Specialized Equipment For Cafes And Bakery Kitchens. Our Range Includes Ovens, Display Counters, Coffee Stations, And Everything Needed To Create A Perfect Cafe Experience.',
        products: [],
    },
    'bar-and-food-court': {
        title: 'BAR & FOOD COURT',
        slug: 'bar-and-food-court',
        description:
            'Premium Equipment For Bars And Food Courts. From Beverage Dispensers To Fast-Service Counters, We Offer Durable And Stylish Solutions For High-Traffic Environments.',
        products: [],
    },
    'canteen-and-cloud-kitchen': {
        title: 'CANTEEN & CLOUD KITCHEN',
        slug: 'canteen-and-cloud-kitchen',
        description:
            'Efficient And Scalable Equipment For Canteens And Cloud Kitchens. Designed For Bulk Cooking And Quick Service, Our Solutions Help You Serve More With Less Effort.',
        products: [],
    },
    'hospital-and-pantry-kitchen': {
        title: 'HOSPITAL & PANTRY KITCHEN',
        slug: 'hospital-and-pantry-kitchen',
        description:
            'Hygienic And Reliable Kitchen Equipment For Hospitals And Pantry Kitchens. Our Products Meet The Highest Standards Of Cleanliness And Safety Required In Healthcare Environments.',
        products: [],
    },
};

export const saveProductsData = () => {
    localStorage.setItem('productsData', JSON.stringify(defaultProductsData));
};

export default defaultProductsData;

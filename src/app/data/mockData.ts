export const foodTrucks = [
  {
    id: 'taco-heaven',
    name: 'Taco Heaven',
    cuisine: 'Mexican Street Food',
    image: 'https://images.unsplash.com/photo-1615818449536-f26c1e1fe0f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWNvJTIwZm9vZCUyMHRydWNrfGVufDF8fHx8MTc3MTM0MjgyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 8,
    hasOffer: true,
    isOpen: true,
    categories: [
      {
        name: 'Tacos',
        items: [
          { id: 'taco-1', name: 'Carne Asada Taco', description: 'Grilled beef with cilantro and onions', price: 4.20 },
          { id: 'taco-2', name: 'Al Pastor Taco', description: 'Marinated pork with pineapple', price: 4.20 },
          { id: 'taco-3', name: 'Fish Taco', description: 'Battered fish with cabbage slaw', price: 4.65 }
        ]
      },
      {
        name: 'Burritos',
        items: [
          { id: 'burrito-1', name: 'California Burrito', description: 'Steak, fries, cheese, guacamole', price: 11.20 },
          { id: 'burrito-2', name: 'Veggie Burrito', description: 'Black beans, rice, peppers, cheese', price: 9.30 }
        ]
      }
    ],
    offers: [
      { id: 'offer-1', title: '3 Tacos por 9€', description: 'Mix and match any tacos', discount: '30% OFF', originalPrice: 12.60, price: 9.00 },
      { id: 'offer-2', title: 'Burrito Combo', description: 'Any burrito + drink + chips', discount: '2x1', price: 14.00 }
    ]
  },
  {
    id: 'burger-boss',
    name: 'Burger Boss',
    cuisine: 'Gourmet Burgers',
    image: 'https://images.unsplash.com/photo-1565607569011-577f0785694f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBmb29kJTIwdHJ1Y2t8ZW58MXx8fHwxNzcxMzQyODIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 28,
    hasOffer: false,
    isOpen: true,
    categories: [
      {
        name: 'Burgers',
        items: [
          { id: 'burger-1', name: 'Classic Boss Burger', description: 'Beef patty, lettuce, tomato, special sauce', price: 12.10 },
          { id: 'burger-2', name: 'BBQ Bacon Burger', description: 'Double beef, bacon, BBQ sauce, onion rings', price: 14.40 },
          { id: 'burger-3', name: 'Veggie Deluxe', description: 'Plant-based patty, avocado, sprouts', price: 11.20 }
        ]
      },
      {
        name: 'Sides',
        items: [
          { id: 'side-1', name: 'Loaded Fries', description: 'Cheese, bacon, jalapeños', price: 6.50 },
          { id: 'side-2', name: 'Onion Rings', description: 'Crispy golden rings', price: 5.10 }
        ]
      }
    ],
    offers: []
  },
  {
    id: 'pizza-slice',
    name: 'Pizza Slice Paradise',
    cuisine: 'New York Style Pizza',
    image: 'https://images.unsplash.com/photo-1685478566051-8e5c5af68a58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMGZvb2QlMjB0cnVja3xlbnwxfHx8fDE3NzEzNDI4MjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 6,
    hasOffer: true,
    isOpen: true,
    categories: [
      {
        name: 'By the Slice',
        items: [
          { id: 'pizza-1', name: 'Pepperoni', description: 'Classic pepperoni pizza', price: 4.65 },
          { id: 'pizza-2', name: 'Margherita', description: 'Fresh mozzarella, basil, tomato', price: 4.20 },
          { id: 'pizza-3', name: 'Veggie Supreme', description: 'Peppers, mushrooms, onions, olives', price: 5.10 }
        ]
      },
      {
        name: 'Whole Pies',
        items: [
          { id: 'pie-1', name: 'Build Your Own Pizza', description: 'Choose up to 5 toppings', price: 18.60 },
          { id: 'pie-2', name: 'Meat Lovers', description: 'Pepperoni, sausage, bacon, ham', price: 23.25 }
        ]
      }
    ],
    offers: [
      { id: 'offer-3', title: '2 Slices + Drink', description: 'Any 2 slices with a soda', discount: 'COMBO', price: 11.20 }
    ]
  },
  {
    id: 'asian-fusion',
    name: 'Asian Fusion Express',
    cuisine: 'Asian Street Food',
    image: 'https://images.unsplash.com/photo-1766985611720-4e85143db30b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMGZvb2QlMjB0cnVja3xlbnwxfHx8fDE3NzEzNDI4MjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 15,
    hasOffer: false,
    isOpen: true,
    categories: [
      {
        name: 'Bowls',
        items: [
          { id: 'bowl-1', name: 'Teriyaki Chicken Bowl', description: 'Grilled chicken, rice, veggies', price: 10.25 },
          { id: 'bowl-2', name: 'Pad Thai', description: 'Rice noodles, peanuts, lime', price: 9.80 },
          { id: 'bowl-3', name: 'Korean BBQ Bowl', description: 'Marinated beef, kimchi, rice', price: 11.60 }
        ]
      },
      {
        name: 'Appetizers',
        items: [
          { id: 'app-1', name: 'Spring Rolls', description: 'Fresh veggies wrapped in rice paper', price: 5.60 },
          { id: 'app-2', name: 'Gyoza', description: 'Pan-fried pork dumplings', price: 6.50 }
        ]
      }
    ],
    offers: []
  }
];

export const bars = [
  {
    id: 'cocktail-club',
    name: 'The Cocktail Club',
    type: 'Craft Cocktails',
    image: 'https://images.unsplash.com/photo-1676475061702-c83659cd90ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2NrdGFpbCUyMGJhciUyMG5pZ2h0fGVufDF8fHx8MTc3MTQxNTc5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 12,
    hasOffer: true,
    isOpen: true,
    categories: [
      {
        name: 'Signature Cocktails',
        items: [
          { id: 'cocktail-1', name: 'Mojito', description: 'Rum, mint, lime, soda', price: 11.20 },
          { id: 'cocktail-2', name: 'Old Fashioned', description: 'Bourbon, bitters, orange', price: 13.00 },
          { id: 'cocktail-3', name: 'Margarita', description: 'Tequila, lime, triple sec', price: 10.25 }
        ]
      },
      {
        name: 'Tapas',
        items: [
          { id: 'tapas-1', name: 'Patatas Bravas', description: 'Fried potatoes with spicy sauce', price: 7.45 },
          { id: 'tapas-2', name: 'Olives & Cheese', description: 'Mixed olives and manchego', price: 8.40 }
        ]
      }
    ],
    offers: [
      { id: 'bar-offer-1', title: 'Happy Hour Special', description: '2-for-1 on all cocktails', discount: '50% OFF', originalPrice: 22.40, price: 11.20 },
      { id: 'bar-offer-2', title: 'Cocktail Flight', description: 'Try 3 mini cocktails', discount: 'TASTING', price: 16.75 }
    ]
  },
  {
    id: 'beer-garden',
    name: 'Craft Beer Garden',
    type: 'Craft Beer & Ale',
    image: 'https://images.unsplash.com/photo-1555970348-3a10b197f131?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmFmdCUyMGJlZXIlMjBiYXJ8ZW58MXx8fHwxNzcxNDE1Nzk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 5,
    hasOffer: false,
    isOpen: true,
    categories: [
      {
        name: 'On Tap',
        items: [
          { id: 'beer-1', name: 'IPA', description: 'Hoppy and aromatic', price: 7.45 },
          { id: 'beer-2', name: 'Wheat Beer', description: 'Light and refreshing', price: 6.50 },
          { id: 'beer-3', name: 'Stout', description: 'Dark and rich', price: 7.90 }
        ]
      },
      {
        name: 'Snacks',
        items: [
          { id: 'snack-1', name: 'Pretzel Bites', description: 'With beer cheese dip', price: 6.50 },
          { id: 'snack-2', name: 'Wings', description: 'Buffalo or BBQ', price: 11.20 }
        ]
      }
    ],
    offers: []
  },
  {
    id: 'wine-lounge',
    name: 'Wine Lounge',
    type: 'Wine & Cheese',
    image: 'https://images.unsplash.com/photo-1648838449733-64d7ce61f1f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW5lJTIwYmFyJTIwZWxlZ2FudHxlbnwxfHx8fDE3NzEzMTE5ODB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 20,
    hasOffer: true,
    isOpen: true,
    categories: [
      {
        name: 'By the Glass',
        items: [
          { id: 'wine-1', name: 'Chardonnay', description: 'Buttery California white', price: 9.30 },
          { id: 'wine-2', name: 'Pinot Noir', description: 'Light-bodied red', price: 11.20 },
          { id: 'wine-3', name: 'Prosecco', description: 'Italian sparkling', price: 10.25 }
        ]
      },
      {
        name: 'Cheese Plates',
        items: [
          { id: 'cheese-1', name: 'Artisan Cheese Board', description: '5 cheeses with crackers', price: 16.75 },
          { id: 'cheese-2', name: 'Charcuterie Board', description: 'Meats, cheese, olives, nuts', price: 20.50 }
        ]
      }
    ],
    offers: [
      { id: 'wine-offer-1', title: 'Wine & Cheese Pairing', description: 'Any glass + cheese plate', discount: '15% OFF', originalPrice: 26.05, price: 22.35 }
    ]
  },
  {
    id: 'tiki-bar',
    name: 'Tropical Tiki Bar',
    type: 'Tropical Drinks',
    image: 'https://images.unsplash.com/photo-1625321642529-2f534e03bc0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aWtpJTIwYmFyJTIwdHJvcGljYWx8ZW58MXx8fHwxNzcxNDE1Nzk1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    waitTime: 10,
    hasOffer: false,
    isOpen: true,
    categories: [
      {
        name: 'Tiki Drinks',
        items: [
          { id: 'tiki-1', name: 'Mai Tai', description: 'Rum, lime, orgeat, orange liqueur', price: 12.10 },
          { id: 'tiki-2', name: 'Piña Colada', description: 'Rum, coconut, pineapple', price: 11.20 },
          { id: 'tiki-3', name: 'Zombie', description: 'Three rums, fruit juices', price: 14.00 }
        ]
      },
      {
        name: 'Bites',
        items: [
          { id: 'bite-1', name: 'Coconut Shrimp', description: 'Crispy shrimp with sweet chili', price: 11.20 },
          { id: 'bite-2', name: 'Ahi Poke Bowl', description: 'Fresh tuna, rice, seaweed', price: 13.00 }
        ]
      }
    ],
    offers: []
  }
];

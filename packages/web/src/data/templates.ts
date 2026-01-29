export interface Template {
    id: string;
    name_ar: string;
    name_en: string;
    category: "fashion" | "electronics" | "food" | "beauty" | "other";
    style: "minimal" | "bold" | "classic";
    image: string;
    demoUrl: string;
    isBestSeller?: boolean;
}

export const templates: Template[] = [
    {
        id: "fashion-1",
        name_ar: "مودا بريميوم",
        name_en: "Moda Premium",
        category: "fashion",
        style: "minimal",
        image: "/templates/fashion.png",
        demoUrl: "https://demo.apex.com/fashion-1",
        isBestSeller: true,
    },
    {
        id: "tech-1",
        name_ar: "نيكسوس للتقنية",
        name_en: "Nexus Tech",
        category: "electronics",
        style: "bold",
        image: "/templates/electronics.png",
        demoUrl: "https://demo.apex.com/tech-1",
    },
    {
        id: "food-1",
        name_ar: "هارفست بوكس",
        name_en: "Harvest Box",
        category: "food",
        style: "classic",
        image: "/templates/food.png",
        demoUrl: "https://demo.apex.com/food-1",
        isBestSeller: true,
    },
    // We can easily scale this to 1000+ items here or via API
];

/**
 * Auto-generated entity types
 * Contains all CMS collection interfaces in a single file 
 */

/**
 * Collection ID: articles
 * Interface for Articles
 */
export interface Articles {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  title?: string;
  /** @wixFieldType text */
  slug?: string;
  /** @wixFieldType text */
  excerpt?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  mainImage?: string;
  /** @wixFieldType text */
  content?: string;
  /** @wixFieldType text */
  author?: string;
  /** @wixFieldType datetime */
  publishDate?: Date | string;
  /** @wixFieldType text */
  category?: string;
  /** @wixFieldType text */
  seoTitle?: string;
  /** @wixFieldType text */
  seoDescription?: string;
}


/**
 * Collection ID: brands
 * Interface for Brands
 */
export interface Brands {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  brandName?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  brandLogo?: string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType url */
  productsLink?: string;
  /** @wixFieldType url */
  officialWebsite?: string;
  /** @wixFieldType boolean */
  isFeatured?: boolean;
}


/**
 * Collection ID: industrysolutions
 * Interface for Industrysolutions
 */
export interface Industrysolutions {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  industryName?: string;
  /** @wixFieldType text */
  solutionDescription?: string;
  /** @wixFieldType text */
  solvedTasksExamples?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  industryImage?: string;
  /** @wixFieldType text */
  benefits?: string;
  /** @wixFieldType text */
  targetAudience?: string;
}


/**
 * Collection ID: productcategories
 * Interface for ProductCategories
 */
export interface ProductCategories {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  name?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  image?: string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType text */
  slug?: string;
  /** @wixFieldType text */
  metaTitle?: string;
  /** @wixFieldType text */
  metaDescription?: string;
  /** @wixFieldType number */
  displayOrder?: number;
}


/**
 * Collection ID: products
 * @catalog This collection is an eCommerce catalog
 * Interface for Products
 */
export interface Products {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  itemName?: string;
  /** @wixFieldType number */
  itemPrice?: number;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  itemImage?: string;
  /** @wixFieldType text */
  productSku?: string;
  /** @wixFieldType text */
  itemDescription?: string;
  /** @wixFieldType text */
  technicalSpecifications?: string;
  /** @wixFieldType text */
  brand?: string;
  /** @wixFieldType text */
  productType?: string;
  /** @wixFieldType text */
  material?: string;
  /** @wixFieldType text */
  standard?: string;
  /** @wixFieldType boolean */
  isAvailable?: boolean;
  /** @wixFieldType url */
  pdfSpecificationsUrl?: string;
}


/**
 * Collection ID: services
 * Interface for Services
 */
export interface Services {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  serviceName?: string;
  /** @wixFieldType text */
  slug?: string;
  /** @wixFieldType text */
  shortDescription?: string;
  /** @wixFieldType text */
  description?: string;
  /** @wixFieldType image - Contains image URL, render with <Image> component, NOT as text */
  heroImage?: string;
  /** @wixFieldType text */
  workStages?: string;
  /** @wixFieldType text */
  advantages?: string;
  /** @wixFieldType text */
  caseStudiesSummary?: string;
  /** @wixFieldType text */
  faq?: string;
}

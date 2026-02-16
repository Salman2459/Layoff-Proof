import { db } from "./db";
import { companies, layoffEvents, companyActivities } from "@shared/schema";

const sampleCompanies = [
  {
    name: "Meta",
    industry: "Technology",
    employeeCount: "87,000",
    state: "California",
    country: "United States",
    headquarters: "Menlo Park, CA",
    latitude: "37.4837",
    longitude: "-122.1484",
    status: "active_layoffs"
  },
  {
    name: "Amazon",
    industry: "E-commerce",
    employeeCount: "1,500,000",
    state: "Washington",
    country: "United States", 
    headquarters: "Seattle, WA",
    latitude: "47.6062",
    longitude: "-122.3321",
    status: "monitoring"
  },
  {
    name: "Google",
    industry: "Technology",
    employeeCount: "190,000",
    state: "California",
    country: "United States",
    headquarters: "Mountain View, CA",
    latitude: "37.4220",
    longitude: "-122.0841",
    status: "monitoring"
  },
  {
    name: "Microsoft",
    industry: "Technology", 
    employeeCount: "221,000",
    state: "Washington",
    country: "United States",
    headquarters: "Redmond, WA",
    latitude: "47.6740",
    longitude: "-122.1215",
    status: "safe"
  },
  {
    name: "Tesla",
    industry: "Automotive",
    employeeCount: "140,000",
    state: "Texas",
    country: "United States",
    headquarters: "Austin, TX",
    latitude: "30.2672",
    longitude: "-97.7431",
    status: "monitoring"
  },
  {
    name: "Netflix",
    industry: "Entertainment",
    employeeCount: "13,000",
    state: "California",
    country: "United States",
    headquarters: "Los Gatos, CA",
    latitude: "37.2358",
    longitude: "-121.9623",
    status: "active_layoffs"
  },
  {
    name: "Spotify",
    industry: "Entertainment",
    employeeCount: "9,800",
    state: "New York",
    country: "United States",
    headquarters: "New York, NY",
    latitude: "40.7128",
    longitude: "-74.0060",
    status: "active_layoffs"
  },
  {
    name: "Goldman Sachs",
    industry: "Finance",
    employeeCount: "48,000",
    state: "New York",
    country: "United States",
    headquarters: "New York, NY",
    latitude: "40.7128",
    longitude: "-74.0060",
    status: "monitoring"
  },
  {
    name: "Twitter",
    industry: "Technology",
    employeeCount: "7,500",
    state: "California",
    country: "United States",
    headquarters: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "active_layoffs"
  },
  {
    name: "Salesforce",
    industry: "Technology",
    employeeCount: "79,000",
    state: "California",
    country: "United States",
    headquarters: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "active_layoffs"
  },
  {
    name: "PayPal",
    industry: "Finance",
    employeeCount: "30,000",
    state: "California",
    country: "United States",
    headquarters: "San Jose, CA",
    latitude: "37.3382",
    longitude: "-121.8863",
    status: "monitoring"
  },
  {
    name: "Uber",
    industry: "Transportation",
    employeeCount: "32,000",
    state: "California",
    country: "United States",
    headquarters: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "monitoring"
  },
  {
    name: "Lyft",
    industry: "Transportation",
    employeeCount: "5,000",
    state: "California",
    country: "United States",
    headquarters: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "active_layoffs"
  },
  {
    name: "Intel",
    industry: "Technology",
    employeeCount: "131,000",
    state: "California",
    country: "United States",
    headquarters: "Santa Clara, CA",
    latitude: "37.3541",
    longitude: "-121.9552",
    status: "active_layoffs"
  },
  {
    name: "IBM",
    industry: "Technology",
    employeeCount: "297,900",
    state: "New York",
    country: "United States",
    headquarters: "Armonk, NY",
    latitude: "41.1086",
    longitude: "-73.7290",
    status: "monitoring"
  },
  {
    name: "Coinbase",
    industry: "Finance",
    employeeCount: "8,000",
    state: "California",
    country: "United States",
    headquarters: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "monitoring"
  }
];

const sampleLayoffEvents = [
  {
    title: "Meta announces major workforce reduction",
    description: "Meta announces layoffs affecting multiple divisions including Reality Labs and recruiting",
    affectedEmployees: 11000,
    percentageOfWorkforce: "13%",
    affectedJobTitles: ["Software Engineer", "Product Manager", "Data Scientist", "Recruiter"],
    eventDate: new Date("2023-11-09"),
    source: "Company Press Release",
    severity: "high"
  },
  {
    title: "Meta second round of layoffs",
    description: "Meta implements second round of layoffs focusing on business teams",
    affectedEmployees: 10000,
    percentageOfWorkforce: "13%",
    affectedJobTitles: ["Business Analyst", "Marketing Manager", "HR Specialist", "Operations Manager"],
    eventDate: new Date("2023-03-14"),
    source: "Internal Communication",
    severity: "high"
  },
  {
    title: "Amazon reduces workforce in multiple divisions",
    description: "Amazon cuts jobs in AWS, advertising, and Twitch divisions",
    affectedEmployees: 18000,
    percentageOfWorkforce: "1.2%",
    affectedJobTitles: ["Cloud Engineer", "Sales Representative", "Content Creator", "Marketing Specialist"],
    eventDate: new Date("2023-01-18"),
    source: "SEC Filing",
    severity: "high"
  },
  {
    title: "Google parent Alphabet reduces headcount",
    description: "Alphabet cuts jobs across Google and other Alphabet companies",
    affectedEmployees: 12000,
    percentageOfWorkforce: "6%",
    affectedJobTitles: ["Software Engineer", "UX Designer", "Product Manager", "Sales Representative"],
    eventDate: new Date("2023-01-20"),
    source: "Company Blog",
    severity: "high"
  },
  {
    title: "Microsoft gaming division layoffs",
    description: "Microsoft cuts jobs in gaming division after Activision acquisition",
    affectedEmployees: 1900,
    percentageOfWorkforce: "0.9%",
    affectedJobTitles: ["Game Developer", "Quality Assurance", "Community Manager", "Marketing Coordinator"],
    eventDate: new Date("2024-01-25"),
    source: "Company Statement",
    severity: "medium"
  },
  {
    title: "Tesla factory workforce adjustment",
    description: "Tesla reduces workforce at multiple manufacturing facilities",
    affectedEmployees: 2700,
    percentageOfWorkforce: "1.9%",
    affectedJobTitles: ["Factory Worker", "Quality Inspector", "Production Supervisor"],
    eventDate: new Date("2022-06-21"),
    source: "Local News Report",
    severity: "medium"
  },
  {
    title: "Netflix streamlines organization",
    description: "Netflix reduces workforce to cut costs amid subscriber slowdown",
    affectedEmployees: 450,
    percentageOfWorkforce: "3.5%",
    affectedJobTitles: ["Content Analyst", "Marketing Manager", "Software Engineer"],
    eventDate: new Date("2022-06-23"),
    source: "Internal Memo",
    severity: "medium"
  },
  {
    title: "Spotify reduces podcast division",
    description: "Spotify cuts jobs in podcast division and other areas",
    affectedEmployees: 600,
    percentageOfWorkforce: "6%",
    affectedJobTitles: ["Audio Engineer", "Content Producer", "Product Manager"],
    eventDate: new Date("2023-01-23"),
    source: "Company Email",
    severity: "medium"
  },
  {
    title: "Spotify second wave of layoffs",
    description: "Spotify announces additional layoffs in technology and marketing teams",
    affectedEmployees: 1500,
    percentageOfWorkforce: "17%",
    affectedJobTitles: ["Software Engineer", "Data Analyst", "Marketing Specialist", "Customer Support"],
    eventDate: new Date("2023-12-04"),
    source: "CEO Statement",
    severity: "high"
  },
  {
    title: "Twitter massive workforce reduction",
    description: "Twitter implements massive layoffs following acquisition",
    affectedEmployees: 3700,
    percentageOfWorkforce: "50%",
    affectedJobTitles: ["Content Moderator", "Software Engineer", "Marketing Manager", "Policy Specialist"],
    eventDate: new Date("2022-11-04"),
    source: "News Reports",
    severity: "high"
  },
  {
    title: "Salesforce restructuring announcement",
    description: "Salesforce reduces workforce amid economic uncertainty",
    affectedEmployees: 8000,
    percentageOfWorkforce: "10%",
    affectedJobTitles: ["Sales Representative", "Customer Success Manager", "Software Engineer", "Consultant"],
    eventDate: new Date("2023-01-04"),
    source: "Company Press Release",
    severity: "high"
  },
  {
    title: "PayPal operational efficiency initiative",
    description: "PayPal cuts jobs to improve operational efficiency",
    affectedEmployees: 2000,
    percentageOfWorkforce: "7%",
    affectedJobTitles: ["Customer Service", "Operations Analyst", "Risk Analyst", "Product Manager"],
    eventDate: new Date("2023-01-31"),
    source: "Internal Communication",
    severity: "medium"
  },
  {
    title: "Uber cost reduction measures",
    description: "Uber implements layoffs as part of cost reduction strategy",
    affectedEmployees: 3700,
    percentageOfWorkforce: "14%",
    affectedJobTitles: ["Customer Support", "Marketing Specialist", "Operations Manager", "Data Analyst"],
    eventDate: new Date("2020-05-18"),
    source: "CEO Email",
    severity: "high"
  },
  {
    title: "Lyft workforce optimization",
    description: "Lyft reduces workforce following declining ridership",
    affectedEmployees: 1200,
    percentageOfWorkforce: "26%",
    affectedJobTitles: ["Customer Support", "Business Development", "Marketing Manager", "Operations Coordinator"],
    eventDate: new Date("2023-04-27"),
    source: "Company Statement",
    severity: "high"
  },
  {
    title: "Intel strategic restructuring",
    description: "Intel announces layoffs as part of strategic restructuring plan",
    affectedEmployees: 15000,
    percentageOfWorkforce: "15%",
    affectedJobTitles: ["Hardware Engineer", "Manufacturing Technician", "Quality Assurance", "Research Scientist"],
    eventDate: new Date("2024-08-01"),
    source: "SEC Filing",
    severity: "high"
  },
  {
    title: "IBM AI transformation layoffs",
    description: "IBM reduces workforce as part of AI-focused transformation",
    affectedEmployees: 3900,
    percentageOfWorkforce: "1.5%",
    affectedJobTitles: ["HR Specialist", "Administrative Assistant", "Customer Service", "Sales Coordinator"],
    eventDate: new Date("2023-05-01"),
    source: "Company Communication",
    severity: "medium"
  },
  {
    title: "Coinbase market downturn response",
    description: "Coinbase cuts workforce due to crypto market downturn",
    affectedEmployees: 1100,
    percentageOfWorkforce: "20%",
    affectedJobTitles: ["Customer Support", "Marketing Manager", "Business Analyst", "Compliance Officer"],
    eventDate: new Date("2022-06-14"),
    source: "CEO Blog Post",
    severity: "high"
  },
  {
    title: "Coinbase second round layoffs",
    description: "Coinbase implements additional workforce reduction",
    affectedEmployees: 950,
    percentageOfWorkforce: "20%",
    affectedJobTitles: ["Software Engineer", "Product Manager", "Data Scientist", "Security Analyst"],
    eventDate: new Date("2023-01-10"),
    source: "Internal Memo",
    severity: "high"
  }
];

export async function seedDatabase() {
  try {
    console.log("Starting database seed...");

    // Clear existing data
    await db.delete(layoffEvents);
    await db.delete(companyActivities);
    await db.delete(companies);

    // Insert companies
    const insertedCompanies = await db.insert(companies).values(sampleCompanies).returning();
    console.log(`Inserted ${insertedCompanies.length} companies`);

    // Map company names to IDs for layoff events
    const companyMap = new Map(insertedCompanies.map(c => [c.name, c.id]));

    // Insert layoff events
    const layoffEventsWithCompanyIds = [
      { ...sampleLayoffEvents[0], companyId: companyMap.get("Meta")! },
      { ...sampleLayoffEvents[1], companyId: companyMap.get("Meta")! },
      { ...sampleLayoffEvents[2], companyId: companyMap.get("Amazon")! },
      { ...sampleLayoffEvents[3], companyId: companyMap.get("Google")! },
      { ...sampleLayoffEvents[4], companyId: companyMap.get("Microsoft")! },
      { ...sampleLayoffEvents[5], companyId: companyMap.get("Tesla")! },
      { ...sampleLayoffEvents[6], companyId: companyMap.get("Netflix")! },
      { ...sampleLayoffEvents[7], companyId: companyMap.get("Spotify")! },
      { ...sampleLayoffEvents[8], companyId: companyMap.get("Spotify")! },
      { ...sampleLayoffEvents[9], companyId: companyMap.get("Twitter")! },
      { ...sampleLayoffEvents[10], companyId: companyMap.get("Salesforce")! },
      { ...sampleLayoffEvents[11], companyId: companyMap.get("PayPal")! },
      { ...sampleLayoffEvents[12], companyId: companyMap.get("Uber")! },
      { ...sampleLayoffEvents[13], companyId: companyMap.get("Lyft")! },
      { ...sampleLayoffEvents[14], companyId: companyMap.get("Intel")! },
      { ...sampleLayoffEvents[15], companyId: companyMap.get("IBM")! },
      { ...sampleLayoffEvents[16], companyId: companyMap.get("Coinbase")! },
      { ...sampleLayoffEvents[17], companyId: companyMap.get("Coinbase")! },
    ];

    const insertedLayoffs = await db.insert(layoffEvents).values(layoffEventsWithCompanyIds).returning();
    console.log(`Inserted ${insertedLayoffs.length} layoff events`);

    // Insert company activities
    const activities = [
      {
        companyId: companyMap.get("Meta")!,
        description: "Announced Q3 2023 earnings with focus on AI investments",
        activityType: "earnings",
        activityDate: new Date("2023-10-25")
      },
      {
        companyId: companyMap.get("Amazon")!,
        description: "AWS announces new cloud services and enterprise solutions",
        activityType: "announcement",
        activityDate: new Date("2023-11-15")
      },
      {
        companyId: companyMap.get("Google")!,
        description: "Google I/O conference showcases new AI capabilities",
        activityType: "announcement",
        activityDate: new Date("2023-05-10")
      },
      {
        companyId: companyMap.get("Microsoft")!,
        description: "Microsoft announces new hiring initiative for cloud engineers",
        activityType: "hiring",
        activityDate: new Date("2023-11-01")
      }
    ];

    const insertedActivities = await db.insert(companyActivities).values(activities).returning();
    console.log(`Inserted ${insertedActivities.length} company activities`);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
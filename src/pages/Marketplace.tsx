// Marketplace — B2B sustainable hotel products & services marketplace.

import { useState, useMemo } from "react";
import {
  Award, BadgeCheck, BookOpen, ChevronDown, ChevronRight, Download,
  ExternalLink, FileCheck2, FileText, Filter, Leaf, Loader2,
  Package, Search, Send, ShoppingBag, Sparkles, Star, Tag,
  ThumbsUp, Truck, X, Zap, AlertCircle, CheckCircle2, Clock,
  Wind, Droplets, Sun, Flame, Recycle, Building2, Utensils,
  ShowerHead, Lightbulb, ShieldCheck, Plus, Minus,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

type ProductCategory =
  | "energy"
  | "water"
  | "waste"
  | "food-beverage"
  | "amenities"
  | "hvac"
  | "lighting"
  | "renewables"
  | "carbon"
  | "training";

type ClaimStatus =
  | "verified"       // third-party verified, evidence attached
  | "self-declared"  // supplier self-declared, no third-party audit
  | "certified"      // holds a recognised certification (GOTS, FSC, etc.)
  | "pending"        // verification in progress
  | "unverified";    // no claim substantiation

type ScopeCategory = "scope1" | "scope2" | "scope3" | "na";
type HotelArea = "rooms" | "f&b" | "spa" | "back-of-house" | "building" | "all";
type VerificationLevel = 1 | 2 | 3 | 4; // 1=none, 4=third-party audited

type ProductDoc = {
  label: string;
  type: "lca" | "sds" | "cert" | "report" | "datasheet";
};

type Product = {
  id: string;
  name: string;
  supplier: string;
  supplierCountry: string;
  category: ProductCategory;
  tagline: string;
  description: string;
  claimStatus: ClaimStatus;
  certifications: string[];
  verificationLevel: VerificationLevel;
  impactHighlight: string;  // e.g. "–42% energy vs. baseline"
  impactMetric: string;     // short label for card
  scopeCategory: ScopeCategory;
  hotelArea: HotelArea;
  priceRange: string;       // indicative, e.g. "£12–18 / unit"
  leadTimeDays: number;
  moq: string;
  documents: ProductDoc[];
  tags: string[];
  featured?: boolean;
  newBadge?: boolean;
};

type RFQItem = { product: Product; quantity: string; notes: string };
type RFQStatus = "draft" | "sent" | "responded" | "closed";

type MarketplaceTab = "products" | "shortlist" | "rfq";

/* ================================================================== */
/* Constants                                                            */
/* ================================================================== */

const CATEGORIES: { id: ProductCategory | "all"; label: string; icon: React.ElementType }[] = [
  { id: "all",        label: "All Categories",  icon: ShoppingBag },
  { id: "energy",     label: "Energy",          icon: Zap },
  { id: "water",      label: "Water",           icon: Droplets },
  { id: "waste",      label: "Waste",           icon: Recycle },
  { id: "food-beverage", label: "Food & Beverage", icon: Utensils },
  { id: "amenities",  label: "Amenities",       icon: ShowerHead },
  { id: "hvac",       label: "HVAC",            icon: Wind },
  { id: "lighting",   label: "Lighting",        icon: Lightbulb },
  { id: "renewables", label: "Renewables",      icon: Sun },
  { id: "carbon",     label: "Carbon",          icon: Leaf },
  { id: "training",   label: "Training",        icon: BookOpen },
];

const SCOPE_LABELS: Record<ScopeCategory, string> = {
  scope1: "Scope 1",
  scope2: "Scope 2",
  scope3: "Scope 3",
  na: "N/A",
};

const CLAIM_CONFIG: Record<ClaimStatus, { tone: "good" | "warn" | "bad" | "info" | "neutral" | "brand"; label: string; icon: React.ElementType; description: string }> = {
  verified:       { tone: "good",    label: "Verified",       icon: ShieldCheck,    description: "Third-party verified with audited evidence on file." },
  certified:      { tone: "brand",   label: "Certified",      icon: BadgeCheck,     description: "Holds a recognised third-party certification (e.g. GOTS, FSC, B Corp)." },
  "self-declared":{ tone: "warn",    label: "Self-declared",  icon: AlertCircle,    description: "Supplier self-declared. No independent audit has been completed." },
  pending:        { tone: "info",    label: "Pending",        icon: Clock,          description: "Verification is currently in progress with a third party." },
  unverified:     { tone: "neutral", label: "Unverified",     icon: AlertCircle,    description: "No claim substantiation has been provided." },
};

const SMART_RECS: { trigger: string; productId: string; reason: string }[] = [
  { trigger: "energy",  productId: "p-led-001",   reason: "Your lighting accounts for 18% of energy use — LED retrofit typically cuts this by 60%." },
  { trigger: "water",   productId: "p-aer-001",   reason: "Room water consumption is 23% above portfolio median — aerators can reduce flow by 50%." },
  { trigger: "waste",   productId: "p-cmp-001",   reason: "F&B waste diversion rate is 31%. Compostable packaging aligns with your waste pillar target." },
  { trigger: "carbon",  productId: "p-sol-001",   reason: "Scope 2 emissions can be offset via on-site solar — applicable to your roof area profile." },
];

/* ================================================================== */
/* Mock product data (22 products)                                      */
/* ================================================================== */

const PRODUCTS: Product[] = [
  // Energy
  {
    id: "p-led-001",
    name: "SmartLED Pro Hotel Kit",
    supplier: "LumaTech Solutions",
    supplierCountry: "DE",
    category: "lighting",
    tagline: "Hotel-grade LED retrofit with occupancy sensing",
    description: "Full hotel room LED retrofit kit including bedside, bathroom, corridor, and lobby fixtures. Integrated PIR occupancy sensor dims to 10% after 5 min vacancy. Rated 50,000 hrs. DALI-compatible.",
    claimStatus: "verified",
    certifications: ["Energy Star", "DALI-2", "CE"],
    verificationLevel: 4,
    impactHighlight: "–60% lighting energy",
    impactMetric: "–60% energy",
    scopeCategory: "scope2",
    hotelArea: "rooms",
    priceRange: "£8–14 / unit",
    leadTimeDays: 14,
    moq: "50 units",
    documents: [
      { label: "Energy Performance Report", type: "report" },
      { label: "Product Datasheet", type: "datasheet" },
    ],
    tags: ["lighting", "energy", "retrofit"],
    featured: true,
  },
  {
    id: "p-bms-001",
    name: "EcoControl BMS Module",
    supplier: "Siemens Building Tech",
    supplierCountry: "CH",
    category: "energy",
    tagline: "AI-driven building management for hotels",
    description: "Cloud-connected BMS module with ML-based HVAC scheduling. Integrates with Heatmiser, KNX, and BACnet. Provides real-time energy dashboards, anomaly alerts, and automated setpoint optimisation.",
    claimStatus: "verified",
    certifications: ["ISO 50001", "BACnet BTL"],
    verificationLevel: 4,
    impactHighlight: "–28% total energy",
    impactMetric: "–28% energy",
    scopeCategory: "scope2",
    hotelArea: "building",
    priceRange: "£4,500–8,000 / system",
    leadTimeDays: 30,
    moq: "1 system",
    documents: [
      { label: "ISO 50001 Certificate", type: "cert" },
      { label: "Case Study", type: "report" },
    ],
    tags: ["BMS", "AI", "HVAC", "energy management"],
    featured: true,
  },
  {
    id: "p-smt-001",
    name: "GuestRoom SmartStat",
    supplier: "Ecobee Commercial",
    supplierCountry: "CA",
    category: "hvac",
    tagline: "Occupancy-aware thermostat for hotel rooms",
    description: "Commercial thermostat with built-in occupancy sensor and PMS integration. Auto-setback when room is unoccupied; restores guest preference on key-card insert. Reduces HVAC energy 22–35% per room.",
    claimStatus: "certified",
    certifications: ["Energy Star", "ASHRAE 90.1"],
    verificationLevel: 3,
    impactHighlight: "–28% HVAC / room",
    impactMetric: "–28% HVAC",
    scopeCategory: "scope2",
    hotelArea: "rooms",
    priceRange: "£85–120 / room",
    leadTimeDays: 21,
    moq: "10 units",
    documents: [{ label: "Energy Star Certificate", type: "cert" }],
    tags: ["thermostat", "HVAC", "PMS integration"],
  },

  // Water
  {
    id: "p-aer-001",
    name: "HydroSave Aerator Set",
    supplier: "Neoperl UK",
    supplierCountry: "GB",
    category: "water",
    tagline: "Flow-regulated aerators for hospitality",
    description: "Hospitality-rated flow regulators for basin, shower, and kitchen. Maintains pressure perception while reducing flow to 5 L/min (basin) and 8 L/min (shower). Anti-scaling ceramic cartridge. 5-year warranty.",
    claimStatus: "certified",
    certifications: ["WRAS", "ISO 14021"],
    verificationLevel: 3,
    impactHighlight: "–50% water flow",
    impactMetric: "–50% water",
    scopeCategory: "scope3",
    hotelArea: "rooms",
    priceRange: "£3–7 / unit",
    leadTimeDays: 7,
    moq: "100 units",
    documents: [
      { label: "WRAS Approval", type: "cert" },
      { label: "Flow Test Data", type: "datasheet" },
    ],
    tags: ["water", "aerator", "low-flow"],
    featured: true,
    newBadge: true,
  },
  {
    id: "p-reu-001",
    name: "GreyFlow Reuse System",
    supplier: "AquaCycle Systems",
    supplierCountry: "NL",
    category: "water",
    tagline: "Compact greywater recycling for hotels",
    description: "Modular greywater treatment and reuse system for toilet flushing and irrigation. Treats bathroom greywater through biological filter and UV. Reduces mains water demand by up to 40%. Building Regulations compliant.",
    claimStatus: "verified",
    certifications: ["CE", "NSF/ANSI 350"],
    verificationLevel: 4,
    impactHighlight: "–40% mains water",
    impactMetric: "–40% water",
    scopeCategory: "scope3",
    hotelArea: "building",
    priceRange: "£12,000–25,000 / system",
    leadTimeDays: 60,
    moq: "1 system",
    documents: [
      { label: "NSF/ANSI 350 Certificate", type: "cert" },
      { label: "Installation Guide", type: "datasheet" },
    ],
    tags: ["greywater", "water recycling", "circular"],
  },

  // Waste & Packaging
  {
    id: "p-cmp-001",
    name: "BioServe Compostable Range",
    supplier: "Vegware Ltd",
    supplierCountry: "GB",
    category: "waste",
    tagline: "Plant-based compostable F&B packaging",
    description: "Full F&B packaging range: cups, lids, plates, cutlery, and containers. PFAS-free. Certified industrially compostable in 12 weeks. Compatible with on-site composting or local authority collections.",
    claimStatus: "certified",
    certifications: ["DIN CERTCO", "SEEDLING", "BPI"],
    verificationLevel: 3,
    impactHighlight: "100% compostable",
    impactMetric: "Zero landfill",
    scopeCategory: "scope3",
    hotelArea: "f&b",
    priceRange: "£0.08–0.35 / item",
    leadTimeDays: 10,
    moq: "£500 order value",
    documents: [
      { label: "DIN CERTCO Certificate", type: "cert" },
      { label: "Compostability Test Report", type: "report" },
    ],
    tags: ["packaging", "compostable", "F&B", "waste"],
    newBadge: true,
  },
  {
    id: "p-fdc-001",
    name: "FoodCycle Digester Unit",
    supplier: "BioHiTech Global",
    supplierCountry: "US",
    category: "waste",
    tagline: "On-site aerobic food waste digester",
    description: "Compact aerobic digester processes up to 500 kg/day of food waste into a nutrient-rich liquid effluent dischargeable to drain. Eliminates food waste collections, reduces Scope 3 transport emissions, HACCP-compliant.",
    claimStatus: "verified",
    certifications: ["HACCP", "NSF"],
    verificationLevel: 4,
    impactHighlight: "–100% food waste to landfill",
    impactMetric: "Zero food waste",
    scopeCategory: "scope3",
    hotelArea: "f&b",
    priceRange: "£18,000–35,000 / unit",
    leadTimeDays: 45,
    moq: "1 unit",
    documents: [
      { label: "Performance Data Sheet", type: "datasheet" },
      { label: "HACCP Compliance Report", type: "report" },
    ],
    tags: ["food waste", "digester", "F&B", "Scope 3"],
  },

  // Food & Beverage
  {
    id: "p-org-001",
    name: "PureHarvest Organic Amenity Set",
    supplier: "Green Hospitality Co.",
    supplierCountry: "FR",
    category: "amenities",
    tagline: "Organic-certified hotel toiletry range",
    description: "COSMOS-certified organic hotel toiletry range. Refillable 300 mL dispensers and single-use miniatures available. Biodegradable formulas, recyclable packaging, no microplastics or parabens. Produced in EU.",
    claimStatus: "certified",
    certifications: ["COSMOS ORGANIC", "Leaping Bunny", "B Corp"],
    verificationLevel: 4,
    impactHighlight: "–85% plastic vs. miniatures",
    impactMetric: "–85% plastic",
    scopeCategory: "scope3",
    hotelArea: "rooms",
    priceRange: "£1.80–3.50 / room / night",
    leadTimeDays: 21,
    moq: "£1,000 order value",
    documents: [
      { label: "COSMOS Certificate", type: "cert" },
      { label: "Safety Data Sheet", type: "sds" },
    ],
    tags: ["toiletries", "organic", "plastic-free", "amenities"],
    featured: true,
  },
  {
    id: "p-lnc-001",
    name: "EcoLaundry Concentrate",
    supplier: "Ecover Professional",
    supplierCountry: "BE",
    category: "back-of-house" as unknown as ProductCategory,
    tagline: "Concentrated biodegradable laundry detergent",
    description: "Ultra-concentrated (1:80 dilution) laundry detergent for hotel linen operations. EU Ecolabel certified. Cold-wash effective at 30°C. Reduces chemical use by 87% vs. standard formulations. PH neutral on fabrics.",
    claimStatus: "certified",
    certifications: ["EU Ecolabel", "Cradle to Cradle", "Vegan Society"],
    verificationLevel: 3,
    impactHighlight: "–87% chemical volume",
    impactMetric: "–87% chemicals",
    scopeCategory: "scope3",
    hotelArea: "back-of-house",
    priceRange: "£4.20–6.80 / L",
    leadTimeDays: 5,
    moq: "20 L",
    documents: [
      { label: "EU Ecolabel Certificate", type: "cert" },
      { label: "Dilution Guide", type: "datasheet" },
    ],
    tags: ["laundry", "cleaning", "back-of-house"],
  },

  // Renewables
  {
    id: "p-sol-001",
    name: "RoofWatt Commercial PV Array",
    supplier: "SunPower Commercial",
    supplierCountry: "US",
    category: "renewables",
    tagline: "High-efficiency rooftop solar for hospitality",
    description: "Maxeon Gen 6 panel commercial arrays for flat and pitched hotel roofs. 22.7% efficiency. 25-year power guarantee. Full installation service including planning, structural survey, inverter, grid connection, and monitoring dashboard.",
    claimStatus: "verified",
    certifications: ["MCS", "PV CYCLE", "IEC 61215"],
    verificationLevel: 4,
    impactHighlight: "–35% Scope 2 per site",
    impactMetric: "–35% Scope 2",
    scopeCategory: "scope2",
    hotelArea: "building",
    priceRange: "£850–1,100 / kWp installed",
    leadTimeDays: 90,
    moq: "10 kWp",
    documents: [
      { label: "MCS Certificate", type: "cert" },
      { label: "Performance Guarantee", type: "report" },
    ],
    tags: ["solar", "PV", "renewables", "Scope 2"],
    featured: true,
  },
  {
    id: "p-ppa-001",
    name: "GreenPower PPA",
    supplier: "Amber Energy",
    supplierCountry: "GB",
    category: "renewables",
    tagline: "Certified renewable electricity PPA",
    description: "Long-term Power Purchase Agreement for certified UK wind-generated electricity. Comes with Renewable Energy Guarantees of Origin (REGOs). 5, 10, or 15-year term. Fully additive — new capacity contracted, not REGOs traded.",
    claimStatus: "certified",
    certifications: ["REGO", "OFGEM certified"],
    verificationLevel: 4,
    impactHighlight: "100% renewable electricity",
    impactMetric: "100% renewable",
    scopeCategory: "scope2",
    hotelArea: "all",
    priceRange: "Market rate + £5 / MWh premium",
    leadTimeDays: 120,
    moq: "250 MWh / yr",
    documents: [
      { label: "REGO Sample Certificate", type: "cert" },
      { label: "PPA Term Sheet", type: "report" },
    ],
    tags: ["PPA", "renewable electricity", "Scope 2"],
  },

  // Carbon
  {
    id: "p-cof-001",
    name: "VerraGold Carbon Credits",
    supplier: "South Pole",
    supplierCountry: "CH",
    category: "carbon",
    tagline: "High-integrity Verra VCS carbon offsets",
    description: "Verified Carbon Standard (VCS) carbon credits from REDD+ forest protection projects in the Amazon and Congo Basin. Gold Standard co-benefit certification. Retirement certificates issued within 30 days of purchase.",
    claimStatus: "verified",
    certifications: ["Verra VCS", "Gold Standard", "CCBS"],
    verificationLevel: 4,
    impactHighlight: "1 tCO₂e / credit",
    impactMetric: "Scope 1–3 offset",
    scopeCategory: "scope1",
    hotelArea: "all",
    priceRange: "£18–32 / tCO₂e",
    leadTimeDays: 30,
    moq: "10 tCO₂e",
    documents: [
      { label: "VCS Project Report", type: "report" },
      { label: "Gold Standard Certificate", type: "cert" },
    ],
    tags: ["carbon offset", "VCS", "REDD+"],
  },

  // Training
  {
    id: "p-trn-001",
    name: "GreenOps Staff Training Suite",
    supplier: "Greengage Hospitality",
    supplierCountry: "GB",
    category: "training",
    tagline: "Accredited sustainability training for hotel teams",
    description: "eLearning and in-person sustainability training designed for hotel operations teams. Covers energy, water, waste, supply chain, and guest communication. CPD-accredited. Multilingual (EN/FR/DE/ES/AR). Includes manager train-the-trainer kit.",
    claimStatus: "certified",
    certifications: ["CPD Certified", "ISO 14001 aligned"],
    verificationLevel: 3,
    impactHighlight: "CPD accredited",
    impactMetric: "Staff upskilling",
    scopeCategory: "na",
    hotelArea: "all",
    priceRange: "£45–120 / staff / yr",
    leadTimeDays: 5,
    moq: "10 licences",
    documents: [
      { label: "CPD Accreditation Letter", type: "cert" },
      { label: "Course Catalogue", type: "datasheet" },
    ],
    tags: ["training", "staff", "CPD", "eLearning"],
    newBadge: true,
  },
  {
    id: "p-chp-001",
    name: "MicroCHP Hotel Unit",
    supplier: "2G Energy",
    supplierCountry: "DE",
    category: "energy",
    tagline: "Combined heat and power for hotel baseload",
    description: "Natural gas or biogas-fuelled micro-CHP unit (50–200 kWe) producing simultaneous electricity and heat. 87% overall efficiency. Reduces Scope 1 and Scope 2 emissions when displacing grid electricity. Grid export capable.",
    claimStatus: "verified",
    certifications: ["ISO 14001", "G99", "MCS"],
    verificationLevel: 4,
    impactHighlight: "87% overall efficiency",
    impactMetric: "–35% energy cost",
    scopeCategory: "scope1",
    hotelArea: "building",
    priceRange: "£85,000–200,000 installed",
    leadTimeDays: 120,
    moq: "1 unit",
    documents: [
      { label: "Technical Spec", type: "datasheet" },
      { label: "MCS Certificate", type: "cert" },
    ],
    tags: ["CHP", "energy", "Scope 1", "heat"],
  },
  {
    id: "p-evs-001",
    name: "ChargePoint Hotel EV Fleet",
    supplier: "ChargePoint",
    supplierCountry: "US",
    category: "energy",
    tagline: "Managed EV charging for hotel car parks",
    description: "Networked EV charging stations for hotel and guest car parks. 7 kW AC wallboxes and 50–150 kW DC rapid chargers. Cloud-managed load balancing, RFID and app payment, OLEV grant eligible. Revenue share model available.",
    claimStatus: "certified",
    certifications: ["OLEV OZEV", "OCPP 2.0", "CE"],
    verificationLevel: 3,
    impactHighlight: "Zero tailpipe at hotel",
    impactMetric: "EV charging",
    scopeCategory: "scope3",
    hotelArea: "building",
    priceRange: "£1,200–45,000 / point",
    leadTimeDays: 60,
    moq: "2 points",
    documents: [
      { label: "OCPP Compliance Sheet", type: "cert" },
    ],
    tags: ["EV", "charging", "guest amenity"],
  },
  {
    id: "p-rfb-001",
    name: "ReStuff Recycled Fill Bedding",
    supplier: "The Fine Cotton Co.",
    supplierCountry: "GB",
    category: "amenities",
    tagline: "Hotel-grade duvets and pillows from recycled PET",
    description: "Hotel duvets and pillows filled with RCS-certified recycled PET fibre (100% post-consumer plastic bottles). Cover fabric: GOTS-certified organic cotton. 300 thread count. Commercial laundry rated to 300 washes.",
    claimStatus: "certified",
    certifications: ["RCS", "GOTS", "OEKO-TEX 100"],
    verificationLevel: 4,
    impactHighlight: "–70% carbon vs. down",
    impactMetric: "Recycled content",
    scopeCategory: "scope3",
    hotelArea: "rooms",
    priceRange: "£28–65 / item",
    leadTimeDays: 28,
    moq: "50 items",
    documents: [
      { label: "RCS Certificate", type: "cert" },
      { label: "LCA Summary", type: "lca" },
    ],
    tags: ["linen", "recycled", "bedding", "GOTS"],
  },
  {
    id: "p-lca-001",
    name: "EcoFolio LCA Tool",
    supplier: "PRé Sustainability",
    supplierCountry: "NL",
    category: "training",
    tagline: "Hotel-specific lifecycle assessment platform",
    description: "SimaPro-based LCA tool pre-loaded with hospitality-specific processes and ecoinvent 3.10 background database. Covers FF&E, F&B, energy, water, and transport. GHG Protocol and EN 15978 compliant output reports.",
    claimStatus: "self-declared",
    certifications: ["ISO 14040 aligned"],
    verificationLevel: 2,
    impactHighlight: "Hotspot analysis",
    impactMetric: "Decision support",
    scopeCategory: "na",
    hotelArea: "all",
    priceRange: "£8,000–15,000 / yr licence",
    leadTimeDays: 10,
    moq: "1 licence",
    documents: [
      { label: "Methodology White Paper", type: "report" },
    ],
    tags: ["LCA", "tool", "reporting", "measurement"],
  },
  {
    id: "p-flt-001",
    name: "AquaPure Kitchen Filter",
    supplier: "BRITA Professional",
    supplierCountry: "DE",
    category: "water",
    tagline: "Commercial water filtration for hotel kitchens",
    description: "BRITA PURITY C quartz filter system for hotel kitchen and coffee equipment. Reduces limescale and chlorine, extends appliance life, and eliminates single-use plastic water bottles. IoT filter life monitoring.",
    claimStatus: "certified",
    certifications: ["NSF/ANSI 42", "WRAS"],
    verificationLevel: 3,
    impactHighlight: "–100% plastic bottles",
    impactMetric: "Zero single-use plastic",
    scopeCategory: "scope3",
    hotelArea: "f&b",
    priceRange: "£450–900 / system",
    leadTimeDays: 7,
    moq: "1 system",
    documents: [
      { label: "NSF/ANSI 42 Certificate", type: "cert" },
    ],
    tags: ["water", "filtration", "F&B", "plastic-free"],
  },
  {
    id: "p-lnl-001",
    name: "CleanStay Linen Hire",
    supplier: "Johnsons Hotel Linen",
    supplierCountry: "GB",
    category: "amenities",
    tagline: "Sustainable linen rental with closed-loop return",
    description: "Full hotel linen rental service: sheets, towels, tablecloths, and robes. Industrial laundry powered by renewable energy, EMAS-registered site. Closed-loop: worn linen recycled into industrial wipers. GOTS-certified stock.",
    claimStatus: "verified",
    certifications: ["EMAS", "GOTS", "ISO 14001"],
    verificationLevel: 4,
    impactHighlight: "100% renewable laundry energy",
    impactMetric: "Closed-loop linen",
    scopeCategory: "scope3",
    hotelArea: "rooms",
    priceRange: "£0.90–2.40 / kg",
    leadTimeDays: 14,
    moq: "50 kg / week",
    documents: [
      { label: "EMAS Environmental Statement", type: "report" },
      { label: "GOTS Certificate", type: "cert" },
    ],
    tags: ["linen", "rental", "circular", "laundry"],
  },
  {
    id: "p-bst-001",
    name: "BioSoil Composting System",
    supplier: "Ridan Composters",
    supplierCountry: "GB",
    category: "waste",
    tagline: "On-site food waste composting for hotels",
    description: "Hot-composting unit processing up to 200 kg/week of food waste on-site into usable compost within 14 days. Suitable for garden, terrace, and kitchen waste. No planning permission required for most installations. Off-grid capable.",
    claimStatus: "self-declared",
    certifications: ["PAS 100 compliant output"],
    verificationLevel: 2,
    impactHighlight: "Zero food waste to collection",
    impactMetric: "On-site composting",
    scopeCategory: "scope3",
    hotelArea: "f&b",
    priceRange: "£3,500–7,500 / unit",
    leadTimeDays: 21,
    moq: "1 unit",
    documents: [
      { label: "PAS 100 Compliance Note", type: "report" },
    ],
    tags: ["composting", "food waste", "on-site"],
  },
  {
    id: "p-ins-001",
    name: "AeroCore Wall Insulation",
    supplier: "Knauf Insulation",
    supplierCountry: "BE",
    category: "energy",
    tagline: "Low-carbon mineral wool for hotel wall refurb",
    description: "ECOSE® technology mineral wool wall insulation made with 70% recycled content and no formaldehyde binder. EPD-verified. Reduces heating energy 15–25% in refurbished hotel walls. Fire class A1.",
    claimStatus: "certified",
    certifications: ["EPD", "BREEAM approved", "CE"],
    verificationLevel: 3,
    impactHighlight: "–20% heating energy",
    impactMetric: "–20% heating",
    scopeCategory: "scope2",
    hotelArea: "building",
    priceRange: "£4–9 / m²",
    leadTimeDays: 10,
    moq: "50 m²",
    documents: [
      { label: "Environmental Product Declaration", type: "lca" },
      { label: "Fire Test Certificate", type: "cert" },
    ],
    tags: ["insulation", "refurb", "building fabric"],
  },
];

/* ================================================================== */
/* Sub-components                                                        */
/* ================================================================== */

function ClaimBadge({ status }: { status: ClaimStatus }) {
  const cfg = CLAIM_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge tone={cfg.tone}>
      <Icon size={10} className="shrink-0" />
      {cfg.label}
    </Badge>
  );
}

function DocTypeIcon({ type }: { type: ProductDoc["type"] }) {
  const icons: Record<ProductDoc["type"], React.ElementType> = {
    lca: Leaf, sds: AlertCircle, cert: Award, report: FileText, datasheet: FileCheck2,
  };
  const Icon = icons[type];
  return <Icon size={12} className="text-ink-400 shrink-0" />;
}

function ScopeTag({ scope }: { scope: ScopeCategory }) {
  if (scope === "na") return null;
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500 border border-ink-200 rounded px-1.5 py-0.5">
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function VerificationBar({ level }: { level: VerificationLevel }) {
  const labels = ["None", "Self-decl.", "Partial", "Audited"];
  const colours = ["bg-ink-200", "bg-amber-400", "bg-sky-400", "bg-brand-500"];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("h-1.5 w-5 rounded-full", i <= level ? colours[level - 1] : "bg-ink-100")}
          />
        ))}
      </div>
      <span className="text-[10px] text-ink-500">{labels[level - 1]}</span>
    </div>
  );
}

function ProductCard({
  product,
  shortlisted,
  onToggleShortlist,
  onClick,
}: {
  product: Product;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onClick: () => void;
}) {
  const CatIcon = CATEGORIES.find((c) => c.id === product.category)?.icon ?? Package;
  return (
    <div
      className="relative flex flex-col bg-white border border-ink-100 rounded-2xl overflow-hidden hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Top colour strip */}
      <div className="h-1.5 bg-gradient-to-r from-brand-500 to-brand-300" />

      {/* Badges row */}
      <div className="absolute top-4 right-3 flex gap-1 flex-wrap justify-end">
        {product.featured && (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-brand-50 text-brand-700 border border-brand-200 rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <Star size={8} /> Featured
          </span>
        )}
        {product.newBadge && (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
            New
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <CatIcon size={18} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-ink-900 leading-tight">{product.name}</div>
            <div className="text-[11px] text-ink-500 mt-0.5">{product.supplier} · {product.supplierCountry}</div>
          </div>
        </div>

        <p className="text-[12px] text-ink-600 leading-relaxed line-clamp-2">{product.tagline}</p>

        {/* Impact highlight */}
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2">
          <Zap size={13} className="text-brand-500 shrink-0" />
          <span className="text-[12px] font-semibold text-brand-700">{product.impactHighlight}</span>
        </div>

        {/* Claims + scope */}
        <div className="flex items-center gap-2 flex-wrap">
          <ClaimBadge status={product.claimStatus} />
          <ScopeTag scope={product.scopeCategory} />
        </div>

        {/* Verification bar */}
        <VerificationBar level={product.verificationLevel} />

        {/* Price + lead time */}
        <div className="flex items-center justify-between text-[11px] text-ink-500 border-t border-ink-50 pt-2 mt-auto">
          <span className="font-medium text-ink-700">{product.priceRange}</span>
          <span className="flex items-center gap-1"><Truck size={11} />{product.leadTimeDays}d lead</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          className="flex-1 btn-primary text-[11px] py-1.5"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          View details
        </button>
        <button
          className={cn(
            "w-9 h-9 rounded-lg border grid place-items-center transition-colors shrink-0",
            shortlisted
              ? "border-brand-300 bg-brand-50 text-brand-600"
              : "border-ink-200 bg-white text-ink-400 hover:border-brand-300 hover:text-brand-500"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}
          title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
        >
          <Star size={14} className={shortlisted ? "fill-brand-500" : ""} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product Detail Modal                                                 */
/* ------------------------------------------------------------------ */

function ProductDetailModal({
  product,
  open,
  onClose,
  shortlisted,
  onToggleShortlist,
  onAddToRFQ,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  onAddToRFQ: () => void;
}) {
  if (!product) return null;
  const CatIcon = CATEGORIES.find((c) => c.id === product.category)?.icon ?? Package;
  const claimCfg = CLAIM_CONFIG[product.claimStatus];
  const ClaimIcon = claimCfg.icon;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product.name}
      subtitle={`${product.supplier} · ${product.supplierCountry}`}
      size="lg"
      footer={
        <div className="flex gap-2">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors",
              shortlisted
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
            )}
            onClick={onToggleShortlist}
          >
            <Star size={13} className={shortlisted ? "fill-brand-500 text-brand-500" : ""} />
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
          <button
            className="flex-1 btn-primary flex items-center justify-center gap-1.5"
            onClick={() => { onAddToRFQ(); onClose(); }}
          >
            <Send size={13} />
            Request Quotation (RFQ)
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Claim status callout */}
        <div className={cn(
          "flex items-start gap-3 rounded-xl p-4 border",
          claimCfg.tone === "good" ? "bg-green-50 border-green-200" :
          claimCfg.tone === "brand" ? "bg-brand-50 border-brand-200" :
          claimCfg.tone === "warn" ? "bg-amber-50 border-amber-200" :
          "bg-ink-50 border-ink-200"
        )}>
          <ClaimIcon size={16} className="shrink-0 mt-0.5 text-ink-500" />
          <div>
            <div className="text-[12px] font-semibold text-ink-800">{claimCfg.label} claim</div>
            <div className="text-[12px] text-ink-600 mt-0.5">{claimCfg.description}</div>
          </div>
        </div>

        {/* Impact */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Impact</div>
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
            <Zap size={16} className="text-brand-500 shrink-0" />
            <div>
              <div className="font-bold text-brand-800 text-[15px]">{product.impactHighlight}</div>
              <div className="text-[11px] text-brand-600 mt-0.5">Indicative. Actual results depend on installation and baseline consumption.</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">About this product</div>
          <p className="text-[13px] text-ink-700 leading-relaxed">{product.description}</p>
        </div>

        {/* Certifications */}
        {product.certifications.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Certifications</div>
            <div className="flex flex-wrap gap-1.5">
              {product.certifications.map((c) => (
                <span key={c} className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1">
                  <Award size={10} />
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Verification level */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Verification level</div>
          <VerificationBar level={product.verificationLevel} />
        </div>

        {/* Logistics */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Price range", value: product.priceRange },
            { label: "Lead time", value: `${product.leadTimeDays} days` },
            { label: "Min. order", value: product.moq },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-ink-50 border border-ink-100 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
              <div className="text-[13px] font-semibold text-ink-800 mt-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Documents */}
        {product.documents.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Documents</div>
            <div className="space-y-1.5">
              {product.documents.map((doc) => (
                <div key={doc.label} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 hover:border-brand-200 cursor-pointer group">
                  <DocTypeIcon type={doc.type} />
                  <span className="text-[12px] text-ink-700 flex-1">{doc.label}</span>
                  <Download size={12} className="text-ink-300 group-hover:text-brand-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scope & area tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <ScopeTag scope={product.scopeCategory} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500 border border-ink-200 rounded px-1.5 py-0.5">
            {product.hotelArea === "all" ? "All areas" : product.hotelArea.replace("f&b", "F&B").replace("back-of-house", "Back of house")}
          </span>
          {product.tags.map((t) => (
            <span key={t} className="text-[10px] text-ink-400 border border-ink-100 rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-800">
          <div className="font-semibold mb-1">Important notice</div>
          Hotel Optimizer lists products for discovery and evaluation only. We do not endorse, warrant, or guarantee product performance, supplier claims, or certification validity. All claims should be independently verified before procurement. Price ranges are indicative and subject to change. Hotel Optimizer is not party to any purchase contract.
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* RFQ Modal                                                            */
/* ------------------------------------------------------------------ */

function RFQModal({
  open,
  onClose,
  items,
  onUpdateItem,
  onRemoveItem,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  items: RFQItem[];
  onUpdateItem: (id: string, field: "quantity" | "notes", value: string) => void;
  onRemoveItem: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request for Quotation"
      subtitle="Send enquiries to selected suppliers"
      size="lg"
      footer={
        <div className="flex gap-2">
          <button className="px-4 py-2 text-[12px] border border-ink-200 rounded-lg text-ink-600 hover:bg-ink-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className="flex-1 btn-primary flex items-center justify-center gap-1.5"
            onClick={onSubmit}
            disabled={items.length === 0}
          >
            <Send size={13} />
            Submit RFQ ({items.length} product{items.length !== 1 ? "s" : ""})
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-[12px] text-sky-800">
          <div className="font-semibold mb-0.5">How RFQ works</div>
          Your enquiry is forwarded to the supplier's trade team. Responses typically arrive within 2–5 business days. Hotel Optimizer does not negotiate on your behalf.
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-ink-400 text-[13px]">No products in RFQ basket. Close and add products.</div>
        )}

        {items.map(({ product, quantity, notes }) => (
          <div key={product.id} className="border border-ink-100 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[13px] text-ink-900">{product.name}</div>
                <div className="text-[11px] text-ink-500">{product.supplier}</div>
              </div>
              <button
                className="text-ink-300 hover:text-bad transition-colors"
                onClick={() => onRemoveItem(product.id)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-600 mb-1">Estimated quantity</label>
                <input
                  className="input text-[12px]"
                  placeholder={`e.g. ${product.moq}`}
                  value={quantity}
                  onChange={(e) => onUpdateItem(product.id, "quantity", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-600 mb-1">Notes to supplier</label>
                <input
                  className="input text-[12px]"
                  placeholder="Delivery requirements, questions…"
                  value={notes}
                  onChange={(e) => onUpdateItem(product.id, "notes", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-800">
          Hotel Optimizer facilitates introductions only. All contracts, pricing, and delivery terms are agreed directly between your organisation and the supplier. Hotel Optimizer does not take commission or act as an agent.
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/* Main Marketplace Page                                                */
/* ================================================================== */

export default function Marketplace() {
  const [tab, setTab] = useState<MarketplaceTab>("products");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [claimFilter, setClaimFilter] = useState<ClaimStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeCategory | "all">("all");
  const [hotelAreaFilter, setHotelAreaFilter] = useState<HotelArea | "all">("all");
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [rfqItems, setRfqItems] = useState<RFQItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [rfqSent, setRfqSent] = useState<{ id: string; products: string[]; date: string }[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  /* Filtered products */
  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (claimFilter !== "all" && p.claimStatus !== claimFilter) return false;
      if (scopeFilter !== "all" && p.scopeCategory !== scopeFilter) return false;
      if (hotelAreaFilter !== "all" && p.hotelArea !== hotelAreaFilter && p.hotelArea !== "all") return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, categoryFilter, claimFilter, scopeFilter, hotelAreaFilter]);

  const shortlistedProducts = PRODUCTS.filter((p) => shortlist.has(p.id));

  function toggleShortlist(id: string) {
    setShortlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addToRFQ(product: Product) {
    setRfqItems((prev) =>
      prev.find((i) => i.product.id === product.id)
        ? prev
        : [...prev, { product, quantity: "", notes: "" }]
    );
  }

  function updateRFQItem(id: string, field: "quantity" | "notes", value: string) {
    setRfqItems((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, [field]: value } : i))
    );
  }

  function removeRFQItem(id: string) {
    setRfqItems((prev) => prev.filter((i) => i.product.id !== id));
  }

  function submitRFQ() {
    const newEntry = {
      id: `RFQ-${Date.now()}`,
      products: rfqItems.map((i) => i.product.name),
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    };
    setRfqSent((prev) => [newEntry, ...prev]);
    setRfqItems([]);
    setShowRFQModal(false);
    setTab("rfq");
  }

  const TABS: { id: MarketplaceTab; label: string; count?: number }[] = [
    { id: "products", label: "Products & Services" },
    { id: "shortlist", label: "Shortlist", count: shortlist.size },
    { id: "rfq", label: "RFQ Tracker", count: rfqSent.length },
  ];

  return (
    <div className="p-6 space-y-5">

      <PageHeader
        eyebrow="Marketplace"
        title="Sustainable Products & Services"
        subtitle="Discover verified sustainable products and services for your hotel operations · RFQ to suppliers in one click"
        actions={
          rfqItems.length > 0 ? (
            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => setShowRFQModal(true)}
            >
              <Send size={14} />
              RFQ Basket ({rfqItems.length})
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="bg-brand-100 text-brand-700 rounded-full text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Products tab ── */}
      {tab === "products" && (
        <div className="flex gap-5">
          {/* Filter sidebar */}
          {showFilters && (
            <aside className="w-52 shrink-0 space-y-5">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className="input pl-8 text-[12px]"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" onClick={() => setSearch("")}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Category</div>
                <div className="space-y-0.5">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors",
                          categoryFilter === c.id
                            ? "bg-brand-50 text-brand-700 font-medium"
                            : "text-ink-600 hover:bg-ink-50"
                        )}
                        onClick={() => setCategoryFilter(c.id as ProductCategory | "all")}
                      >
                        <Icon size={13} className="shrink-0" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Claim status */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Claim status</div>
                <div className="space-y-0.5">
                  {(["all", "verified", "certified", "self-declared", "pending", "unverified"] as const).map((s) => (
                    <button
                      key={s}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors",
                        claimFilter === s
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-ink-600 hover:bg-ink-50"
                      )}
                      onClick={() => setClaimFilter(s)}
                    >
                      {s === "all" ? "All claims" : CLAIM_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-2">GHG Scope</div>
                <div className="space-y-0.5">
                  {(["all", "scope1", "scope2", "scope3", "na"] as const).map((s) => (
                    <button
                      key={s}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors",
                        scopeFilter === s
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-ink-600 hover:bg-ink-50"
                      )}
                      onClick={() => setScopeFilter(s)}
                    >
                      {s === "all" ? "All scopes" : SCOPE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotel area */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-2">Hotel area</div>
                <div className="space-y-0.5">
                  {(["all", "rooms", "f&b", "spa", "back-of-house", "building"] as const).map((a) => (
                    <button
                      key={a}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors capitalize",
                        hotelAreaFilter === a
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-ink-600 hover:bg-ink-50"
                      )}
                      onClick={() => setHotelAreaFilter(a as HotelArea | "all")}
                    >
                      {a === "all" ? "All areas" : a === "f&b" ? "F&B" : a === "back-of-house" ? "Back of house" : a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {/* Smart recommendations strip */}
            <div className="mb-4 rounded-xl bg-gradient-to-r from-brand-50 to-transparent border border-brand-100 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-brand-500" />
                <span className="text-[12px] font-semibold text-brand-700">Recommended for your hotel</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SMART_RECS.map((rec) => {
                  const p = PRODUCTS.find((pr) => pr.id === rec.productId);
                  if (!p) return null;
                  return (
                    <button
                      key={rec.productId}
                      className="shrink-0 flex items-start gap-2 rounded-lg bg-white border border-brand-100 px-3 py-2 text-left hover:border-brand-300 transition-colors"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <ThumbsUp size={12} className="text-brand-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[11px] font-semibold text-ink-800">{p.name}</div>
                        <div className="text-[10px] text-ink-500 max-w-[200px] leading-relaxed">{rec.reason}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Result count + toggle filters */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-ink-500">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</span>
              <button
                className="flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-800"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter size={12} />
                {showFilters ? "Hide filters" : "Show filters"}
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-ink-400">
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-[14px]">No products match your filters.</div>
                <button
                  className="mt-3 text-[12px] text-brand-600 hover:underline"
                  onClick={() => { setSearch(""); setCategoryFilter("all"); setClaimFilter("all"); setScopeFilter("all"); setHotelAreaFilter("all"); }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    shortlisted={shortlist.has(p.id)}
                    onToggleShortlist={() => toggleShortlist(p.id)}
                    onClick={() => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Shortlist tab ── */}
      {tab === "shortlist" && (
        <div>
          {shortlistedProducts.length === 0 ? (
            <div className="text-center py-20 text-ink-400">
              <Star size={36} className="mx-auto mb-3 opacity-20" />
              <div className="text-[14px]">No products shortlisted yet.</div>
              <button className="mt-3 text-[12px] text-brand-600 hover:underline" onClick={() => setTab("products")}>
                Browse products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-600">{shortlistedProducts.length} shortlisted</span>
                <button
                  className="btn-primary flex items-center gap-1.5 text-[12px]"
                  onClick={() => {
                    shortlistedProducts.forEach((p) => addToRFQ(p));
                    setShowRFQModal(true);
                  }}
                >
                  <Send size={13} />
                  RFQ all shortlisted
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortlistedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    shortlisted
                    onToggleShortlist={() => toggleShortlist(p.id)}
                    onClick={() => setSelectedProduct(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RFQ Tracker tab ── */}
      {tab === "rfq" && (
        <div>
          {rfqSent.length === 0 ? (
            <div className="text-center py-20 text-ink-400">
              <Send size={36} className="mx-auto mb-3 opacity-20" />
              <div className="text-[14px]">No RFQs submitted yet.</div>
              <button className="mt-3 text-[12px] text-brand-600 hover:underline" onClick={() => setTab("products")}>
                Browse products
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rfqSent.map((rfq) => (
                <Card key={rfq.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-ink-800">{rfq.id}</span>
                        <Badge tone="info">Sent</Badge>
                      </div>
                      <div className="text-[12px] text-ink-600">{rfq.products.join(", ")}</div>
                      <div className="text-[11px] text-ink-400 mt-1">Submitted {rfq.date} · Response expected within 2–5 business days</div>
                    </div>
                    <CheckCircle2 size={20} className="text-brand-400 shrink-0 mt-0.5" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        open={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        shortlisted={selectedProduct ? shortlist.has(selectedProduct.id) : false}
        onToggleShortlist={() => selectedProduct && toggleShortlist(selectedProduct.id)}
        onAddToRFQ={() => selectedProduct && addToRFQ(selectedProduct)}
      />

      <RFQModal
        open={showRFQModal}
        onClose={() => setShowRFQModal(false)}
        items={rfqItems}
        onUpdateItem={updateRFQItem}
        onRemoveItem={removeRFQItem}
        onSubmit={submitRFQ}
      />
    </div>
  );
}

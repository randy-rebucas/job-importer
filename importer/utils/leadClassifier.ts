/**
 * Lead classification utilities for AI Lead Engine
 * 
 * Responsibilities:
 * 1. Classify service type from request text
 * 2. Extract urgency level
 * 3. Estimate price range
 * 4. Extract contact information
 */

import type { Lead, ClassifiedLead, ServiceType, UrgencyLevel } from "../types";

// ── Service type keywords mapping ────────────────────────────────────────────

const SERVICE_TYPE_KEYWORDS: Record<ServiceType, string[]> = {
  plumbing: [
    "pipe", "leak", "drain", "faucet", "toilet", "water",
    "plumber", "plumbing", "sewage", "tap", "sink", "shower"
  ],
  cleaning: [
    "clean", "cleaning", "cleaner", "mop", "sweep", "vacuum",
    "dust", "laundry", "housekeeping", "surface", "sanitize"
  ],
  repair: [
    "repair", "fix", "broken", "maintenance", "service", "issue",
    "damage", "problem", "install", "replacement"
  ],
  electrical: [
    "electrical", "wire", "circuit", "light", "power", "outlet",
    "plug", "breaker", "electric", "voltage", "electrician"
  ],
  hvac: [
    "hvac", "air conditioning", "ac", "heating", "cool", "furnace",
    "thermostat", "temperature", "duct", "ventilation"
  ],
  landscaping: [
    "lawn", "garden", "landscape", "grass", "mowing", "tree",
    "shrub", "plant", "yard", "outdoor", "trimming"
  ],
  painting: [
    "paint", "painting", "painter", "color", "wall", "interior",
    "exterior", "brushing", "coat", "primer"
  ],
  carpentry: [
    "carpenter", "wood", "cabinet", "door", "frame", "flooring",
    "deck", "joist", "carpentry", "woodwork", "install"
  ],
  roofing: [
    "roof", "roofing", "shingle", "leak", "gutter", "tile",
    "structure", "roofer", "weatherproofing"
  ],
  other: ["service", "work", "help", "need"]
};

// ── Urgency level indicators ────────────────────────────────────────────────

const URGENCY_INDICATORS: Record<UrgencyLevel, string[]> = {
  "same-day": [
    "urgent", "asap", "today", "emergency", "immediately",
    "right now", "now", "cannot wait", "urgent", "critical"
  ],
  urgent: [
    "urgent", "soon", "tomorrow", "next day", "quickly",
    "hurry", "rush", "important"
  ],
  high: [
    "need soon", "this week", "priority", "quick", "fast",
    "tight", "deadline"
  ],
  medium: [
    "flexible", "whenever", "next week", "can schedule",
    "anytime", "soon"
  ],
  low: [
    "no rush", "when available", "flexible", "whenever",
    "low priority", "future"
  ]
};

// ── Budget range estimations by service type ────────────────────────────────

const DEFAULT_BUDGET_RANGES: Record<ServiceType, { min: number; max: number }> = {
  plumbing: { min: 50, max: 500 },
  cleaning: { min: 30, max: 200 },
  repair: { min: 40, max: 300 },
  electrical: { min: 60, max: 400 },
  hvac: { min: 100, max: 1000 },
  landscaping: { min: 50, max: 500 },
  painting: { min: 100, max: 800 },
  carpentry: { min: 80, max: 600 },
  roofing: { min: 200, max: 2000 },
  other: { min: 50, max: 500 }
};

// ── Budget extraction from text ─────────────────────────────────────────────

function extractBudgetFromText(text: string): { min: number; max: number } | null {
  // Match patterns like: "$100", "$100-200", "100-200", "budget: 100"
  const patterns = [
    /(?:\$|budget[:\s]*)?(\d+)\s*-\s*(\d+)/gi,     // 100-200 or $100-200
    /(?:\$|budget[:\s]*)(\d+)\s*(?:per|\/|hour|hours)?/gi, // $100 or $100/hour
    /(?:costs?\s*(?:around|about|approx|~)?\s*)?(?:\$)?(\d+)/gi // costs around $100
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[2]) {
        // Range pattern
        return {
          min: parseInt(match[1], 10),
          max: parseInt(match[2], 10)
        };
      } else if (match[1]) {
        // Single value pattern
        const value = parseInt(match[1], 10);
        // Assume it's a rough estimate and provide a range
        return {
          min: Math.max(10, value - Math.floor(value * 0.2)),
          max: value + Math.floor(value * 0.3)
        };
      }
    }
  }

  return null;
}

// ── Service type classification ─────────────────────────────────────────────

function classifyServiceType(title: string, description: string): {
  service_type: ServiceType;
  confidence: number;
} {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<ServiceType, number> = {
    plumbing: 0,
    cleaning: 0,
    repair: 0,
    electrical: 0,
    hvac: 0,
    landscaping: 0,
    painting: 0,
    carpentry: 0,
    roofing: 0,
    other: 0
  };

  // Score each service type based on keyword matches
  for (const [serviceType, keywords] of Object.entries(SERVICE_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        scores[serviceType as ServiceType] += matches.length;
      }
    }
  }

  // Find the highest scored service type
  const bestMatch = Object.entries(scores).reduce((prev, current) =>
    prev[1] > current[1] ? prev : current
  );

  const [service_type, score] = bestMatch as [ServiceType, number];
  const totalWords = text.split(/\s+/).length;
  const confidence = Math.min(100, (score / totalWords) * 100);

  return {
    service_type,
    confidence: Math.round(confidence) / 100
  };
}

// ── Urgency extraction ──────────────────────────────────────────────────────

function extractUrgency(title: string, description: string): {
  urgency: UrgencyLevel;
  confidence: number;
} {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<UrgencyLevel, number> = {
    "same-day": 0,
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  // Score each urgency level
  for (const [urgency, keywords] of Object.entries(URGENCY_INDICATORS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        scores[urgency as UrgencyLevel] += matches.length;
      }
    }
  }

  // Priority: same-day > urgent > high > medium > low
  const priorities: UrgencyLevel[] = ["same-day", "urgent", "high", "medium", "low"];
  for (const urgency of priorities) {
    if (scores[urgency] > 0) {
      return {
        urgency,
        confidence: Math.min(1, scores[urgency] / 10)
      };
    }
  }

  // Default to medium if no indicators found
  return { urgency: "medium", confidence: 0.5 };
}

// ── Main classification function ────────────────────────────────────────────

export function classifyLead(lead: Lead): ClassifiedLead {
  const { service_type, confidence: serviceConfidence } = classifyServiceType(
    lead.title,
    lead.description
  );

  const { urgency, confidence: urgencyConfidence } = extractUrgency(
    lead.title,
    lead.description
  );

  // Extract budget from text or use default range
  const extractedBudget = extractBudgetFromText(lead.description);
  const budgetRange = extractedBudget || DEFAULT_BUDGET_RANGES[service_type];

  // Calculate overall confidence
  const matchConfidence = (serviceConfidence + urgencyConfidence) / 2;

  return {
    ...lead,
    service_type,
    urgency,
    estimated_budget: {
      min: budgetRange.min,
      max: budgetRange.max,
      currency: lead.estimated_budget?.currency || "USD"
    },
    match_confidence: matchConfidence,
    classification_analysis: `Classified as ${service_type} (${Math.round(
      serviceConfidence * 100
    )}% confidence) with ${urgency} urgency. Estimated budget: $${budgetRange.min}-${budgetRange.max}.`
  };
}

// ── Provider matching scoring ───────────────────────────────────────────────

export function calculateProviderMatchScore(
  lead: ClassifiedLead,
  providerServiceTypes: ServiceType[],
  providerLocation?: string
): number {
  let score = 0;

  // Service type match (60% weight)
  if (providerServiceTypes.includes(lead.service_type)) {
    score += 60;
  } else {
    // Partial credit for related services
    score += 20;
  }

  // Location match (20% weight)
  if (providerLocation && lead.location) {
    const leadCity = lead.location.split(",")[0].toLowerCase();
    const providerCity = providerLocation.split(",")[0].toLowerCase();
    if (leadCity === providerCity || leadCity.includes(providerCity)) {
      score += 20;
    }
  }

  // Urgency match (20% weight)
  // Providers with recent activity are better for urgent leads
  if (lead.urgency === "same-day" || lead.urgency === "urgent") {
    // This would require provider availability data
    score += 10; // Default partial score
  } else {
    score += 20;
  }

  return Math.min(100, score);
}

// ── Lead validation ────────────────────────────────────────────────────────

export function isValidLead(lead: Lead): { valid: boolean; error?: string } {
  if (!lead.title?.trim()) {
    return { valid: false, error: "Title is required" };
  }

  if (!lead.description?.trim()) {
    return { valid: false, error: "Description is required" };
  }

  if (!lead.location?.trim()) {
    return { valid: false, error: "Location is required" };
  }

  if (!lead.source) {
    return { valid: false, error: "Source platform is required" };
  }

  return { valid: true };
}

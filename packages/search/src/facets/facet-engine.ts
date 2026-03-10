import type { SearchDocument } from '../types/search.types';
import type { Facet, FacetType, FacetConfig } from '../types/facet.types';
import { buildCuisineFacet } from './dynamic-facet-builder';
import { buildPriceRangeFacet } from './dynamic-facet-builder';
import { buildRatingFacet } from './dynamic-facet-builder';
import { buildDietaryFacet } from './dynamic-facet-builder';
import { buildDeliveryTimeFacet } from './dynamic-facet-builder';
import { buildDistanceFacet } from './dynamic-facet-builder';
import type { GeoLocation } from '../types/search.types';

const DEFAULT_FACET_CONFIGS: readonly FacetConfig[] = [
  { type: 'cuisine', label: 'Cuisine', enabled: true },
  { type: 'price_range', label: 'Price Range', enabled: true },
  { type: 'rating', label: 'Rating', enabled: true },
  { type: 'dietary', label: 'Dietary', enabled: true },
  { type: 'delivery_time', label: 'Delivery Time', enabled: true },
  { type: 'distance', label: 'Distance', enabled: false },
] as const;

export class FacetEngine {
  private configs: FacetConfig[];

  constructor(configs?: FacetConfig[]) {
    this.configs = configs ?? [...DEFAULT_FACET_CONFIGS];
  }

  buildFacets(
    documents: SearchDocument[],
    selectedValues?: Map<FacetType, string[]>,
    userLocation?: GeoLocation
  ): Facet[] {
    const facets: Facet[] = [];

    for (const config of this.configs) {
      if (!config.enabled) {
        continue;
      }

      const selected = selectedValues?.get(config.type) ?? [];
      const facet = this.buildFacet(
        config,
        documents,
        selected,
        userLocation
      );

      if (facet.buckets.length > 0) {
        facets.push(facet);
      }
    }

    return facets;
  }

  enableFacet(type: FacetType): void {
    const config = this.configs.find((c) => c.type === type);
    if (config) {
      const index = this.configs.indexOf(config);
      this.configs[index] = { ...config, enabled: true };
    }
  }

  disableFacet(type: FacetType): void {
    const config = this.configs.find((c) => c.type === type);
    if (config) {
      const index = this.configs.indexOf(config);
      this.configs[index] = { ...config, enabled: false };
    }
  }

  private buildFacet(
    config: FacetConfig,
    documents: SearchDocument[],
    selected: string[],
    userLocation?: GeoLocation
  ): Facet {
    switch (config.type) {
      case 'cuisine':
        return buildCuisineFacet(documents, selected);
      case 'price_range':
        return buildPriceRangeFacet(documents, selected);
      case 'rating':
        return buildRatingFacet(documents, selected);
      case 'dietary':
        return buildDietaryFacet(documents, selected);
      case 'delivery_time':
        return buildDeliveryTimeFacet(documents, selected);
      case 'distance':
        return buildDistanceFacet(documents, selected, userLocation);
      default:
        return { type: config.type, label: config.label, buckets: [] };
    }
  }
}

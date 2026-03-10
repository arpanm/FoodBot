import { GraphService } from '../graph/graph-service';
import { PreferenceSummary } from '../types/recommendation.types';
import { PreferenceQuery } from './preference-query';

export class PreferenceSummarizer {
  private readonly preferenceQuery: PreferenceQuery;

  constructor(private readonly graph: GraphService) {
    this.preferenceQuery = new PreferenceQuery(graph);
  }

  generateSummary(userId: string): PreferenceSummary {
    const topCategories = this.preferenceQuery.getTopCategories(userId, 5);
    const topDishes = this.preferenceQuery.getTopDishes(userId, 5);
    const topRestaurants = this.preferenceQuery.getTopRestaurants(userId, 5);
    const timePatterns = this.preferenceQuery.getTimePatterns(userId);

    const naturalLanguageSummary = this.buildNaturalLanguageSummary(
      userId, topCategories, topDishes, topRestaurants, timePatterns
    );

    return {
      userId,
      topCategories,
      topDishes,
      topRestaurants,
      timePatterns,
      naturalLanguageSummary,
    };
  }

  private buildNaturalLanguageSummary(
    userId: string,
    topCategories: { categoryName: string; weight: number }[],
    topDishes: { dishName: string; restaurantName: string }[],
    topRestaurants: { restaurantName: string }[],
    timePatterns: { dayOfWeek: string; timeSlot: string; frequency: number }[]
  ): string {
    const parts: string[] = [];
    parts.push(this.buildUserIntro(userId));
    parts.push(this.buildCategoryPart(topCategories));
    parts.push(this.buildDishPart(topDishes));
    parts.push(this.buildRestaurantPart(topRestaurants));
    parts.push(this.buildTimePart(timePatterns));
    return parts.filter((p) => p.length > 0).join(' ');
  }

  private buildUserIntro(userId: string): string {
    const userNode = this.graph.getNode(`user-${userId}`);
    const name = (userNode?.properties['name'] as string) ?? userId;
    return `${name} typically`;
  }

  private buildCategoryPart(
    categories: { categoryName: string; weight: number }[]
  ): string {
    if (categories.length === 0) {
      return '';
    }
    const primary = categories[0]?.categoryName ?? 'food';
    if (categories.length === 1) {
      return `orders ${primary} food`;
    }
    const secondary = categories[1]?.categoryName;
    if (!secondary) {
      return `orders ${primary} food`;
    }
    return `orders ${primary} food, especially with a preference for ${secondary}`;
  }

  private buildDishPart(
    dishes: { dishName: string; restaurantName: string }[]
  ): string {
    if (dishes.length === 0) {
      return '';
    }
    const dishName = dishes[0]?.dishName ?? 'various dishes';
    return `and favors ${dishName}`;
  }

  private buildRestaurantPart(restaurants: { restaurantName: string }[]): string {
    if (restaurants.length === 0) {
      return '';
    }
    if (restaurants.length === 1) {
      return `from ${restaurants[0]?.restaurantName ?? 'a restaurant'}`;
    }
    const names = restaurants.slice(0, 3).map((r) => r.restaurantName);
    return `from places like ${names.join(', ')}`;
  }

  private buildTimePart(
    patterns: { dayOfWeek: string; timeSlot: string; frequency: number }[]
  ): string {
    if (patterns.length === 0) {
      return '';
    }
    const topPattern = patterns[0];
    if (!topPattern) {
      return '';
    }
    const dayDescriptor = this.getDayDescriptor(topPattern.dayOfWeek);
    return `on ${dayDescriptor} ${topPattern.timeSlot}s.`;
  }

  private getDayDescriptor(day: string): string {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekends = ['Saturday', 'Sunday'];

    if (weekdays.includes(day)) {
      return 'weekday';
    }
    if (weekends.includes(day)) {
      return 'weekend';
    }
    return day.toLowerCase();
  }
}

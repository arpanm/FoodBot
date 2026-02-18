package com.foodbot.mcp.providers.mock;

import com.foodbot.mcp.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;

/**
 * Generates comprehensive mock restaurant and dish data for development and testing.
 * Creates 54 restaurants across 10 cuisine categories and 500+ dishes.
 */
@Slf4j
@Component
public class MockDataGenerator {

    private final List<Restaurant> restaurants = new ArrayList<>();
    private final List<Dish> dishes = new ArrayList<>();
    private int dishCounter = 0;

    @PostConstruct
    public void init() {
        log.info("Initializing mock data generator...");
        generateAllData();
        log.info("Mock data generation complete: {} restaurants, {} dishes", restaurants.size(), dishes.size());
    }

    public List<Restaurant> getRestaurants() {
        return Collections.unmodifiableList(restaurants);
    }

    public List<Dish> getDishes() {
        return Collections.unmodifiableList(dishes);
    }

    private void generateAllData() {
        generateItalianRestaurants();
        generateChineseRestaurants();
        generateIndianRestaurants();
        generateFastFoodRestaurants();
        generateJapaneseRestaurants();
        generateMexicanRestaurants();
        generateThaiRestaurants();
        generateAmericanRestaurants();
        generateMediterraneanRestaurants();
        generateContinentalRestaurants();
    }

    // ========== ITALIAN RESTAURANTS (8) ==========

    private void generateItalianRestaurants() {
        // 1. Pizza Palace
        Restaurant pizzaPalace = createRestaurant("rest-001", "Pizza Palace",
                "Authentic Italian pizzas with wood-fired oven",
                List.of("Italian", "Pizza"), 4.5, 1250, 2,
                new GeoLocation(40.7128, -74.0060), 30, 15.0, 3.99,
                OperatingHours.lunchAndDinner(),
                "123 Broadway, New York, NY", "+1-212-555-0101",
                List.of("Wood-Fired", "Family Friendly", "Dine-In"));

        addDish(pizzaPalace.getId(), "Margherita Pizza", "Classic pizza with tomato sauce, mozzarella, and basil",
                "Main Course", "Pizza", 12.99, "12 inch",
                List.of("Pizza Dough", "Tomato Sauce", "Mozzarella", "Basil"),
                List.of("Vegetarian"), 20, 4.7, 523, false, true,
                List.of(new Customization("Size", List.of("10 inch", "12 inch", "16 inch")),
                        new Customization("Extra Toppings", List.of("Olives", "Mushrooms", "Peppers"))),
                new NutritionalInfo(800, 32, 90, 30, 4, 8, 1200, "12 inch"));

        addDish(pizzaPalace.getId(), "Pepperoni Pizza", "Loaded with pepperoni and mozzarella cheese",
                "Main Course", "Pizza", 14.99, "12 inch",
                List.of("Pizza Dough", "Tomato Sauce", "Mozzarella", "Pepperoni"),
                List.of(), 20, 4.6, 412, false, true,
                List.of(new Customization("Size", List.of("10 inch", "12 inch", "16 inch"))),
                new NutritionalInfo(950, 40, 88, 42, 3, 7, 1800, "12 inch"));

        addDish(pizzaPalace.getId(), "Quattro Formaggi", "Four cheese pizza with mozzarella, gorgonzola, parmesan, and fontina",
                "Main Course", "Pizza", 16.99, "12 inch",
                List.of("Pizza Dough", "Mozzarella", "Gorgonzola", "Parmesan", "Fontina"),
                List.of("Vegetarian"), 22, 4.5, 287, false, false,
                List.of(), new NutritionalInfo(900, 38, 85, 40, 2, 5, 1500, "12 inch"));

        addDish(pizzaPalace.getId(), "Garlic Bread", "Crispy garlic bread with herbs and butter",
                "Appetizer", "Bread", 5.99, "4 pieces",
                List.of("Bread", "Garlic", "Butter", "Herbs"),
                List.of("Vegetarian"), 10, 4.3, 198, false, false,
                List.of(), new NutritionalInfo(320, 8, 42, 14, 2, 3, 480, "4 pieces"));

        addDish(pizzaPalace.getId(), "Tiramisu", "Classic Italian dessert with espresso-soaked ladyfingers",
                "Dessert", "Italian Dessert", 6.99, "1 slice",
                List.of("Ladyfingers", "Espresso", "Mascarpone", "Cocoa"),
                List.of("Vegetarian"), 5, 4.8, 345, false, false,
                List.of(), new NutritionalInfo(380, 6, 45, 18, 0, 22, 120, "1 slice"));

        addDish(pizzaPalace.getId(), "Coca-Cola", "Classic Coca-Cola",
                "Beverage", "Soft Drink", 2.99, "330ml",
                List.of("Carbonated Water", "Sugar", "Caramel Color"),
                List.of("Vegan", "Gluten-Free"), 1, 4.0, 50, false, false,
                List.of(new Customization("Size", List.of("330ml", "500ml", "1L"))),
                new NutritionalInfo(140, 0, 39, 0, 0, 39, 45, "330ml"));

        // 2. Mama's Kitchen
        Restaurant mamasKitchen = createRestaurant("rest-002", "Mama's Kitchen",
                "Homestyle Italian cooking with family recipes passed through generations",
                List.of("Italian", "Pasta"), 4.7, 890, 3,
                new GeoLocation(40.7580, -73.9855), 35, 20.0, 4.99,
                OperatingHours.lunchAndDinner(),
                "456 5th Avenue, New York, NY", "+1-212-555-0102",
                List.of("Family Recipes", "Romantic", "Fine Dining"));

        addDish(mamasKitchen.getId(), "Pasta Carbonara", "Creamy pasta with pancetta, egg, and parmesan",
                "Main Course", "Pasta", 18.99, "Regular",
                List.of("Spaghetti", "Pancetta", "Eggs", "Parmesan", "Black Pepper"),
                List.of(), 18, 4.8, 456, false, true,
                List.of(new Customization("Pasta Type", List.of("Spaghetti", "Fettuccine", "Penne"))),
                new NutritionalInfo(720, 28, 65, 35, 3, 4, 980, "Regular"));

        addDish(mamasKitchen.getId(), "Lasagna", "Layers of pasta, bolognese, bechamel, and cheese",
                "Main Course", "Pasta", 17.99, "Regular",
                List.of("Pasta Sheets", "Bolognese Sauce", "Bechamel", "Mozzarella", "Parmesan"),
                List.of(), 25, 4.7, 389, false, true,
                List.of(), new NutritionalInfo(850, 35, 72, 42, 4, 8, 1100, "Regular"));

        addDish(mamasKitchen.getId(), "Bruschetta", "Toasted bread with tomatoes, garlic, and basil",
                "Appetizer", "Italian Appetizer", 7.99, "4 pieces",
                List.of("Bread", "Tomatoes", "Garlic", "Basil", "Olive Oil"),
                List.of("Vegan"), 8, 4.4, 267, false, false,
                List.of(), new NutritionalInfo(240, 6, 32, 10, 3, 5, 320, "4 pieces"));

        addDish(mamasKitchen.getId(), "Panna Cotta", "Creamy Italian custard with berry sauce",
                "Dessert", "Italian Dessert", 8.99, "1 serving",
                List.of("Cream", "Sugar", "Vanilla", "Gelatin", "Berries"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.6, 198, false, false,
                List.of(), new NutritionalInfo(340, 4, 38, 20, 1, 28, 80, "1 serving"));

        // 3. La Trattoria
        Restaurant laTrattoria = createRestaurant("rest-003", "La Trattoria",
                "Rustic Italian trattoria with hand-made pasta and wood-fired specialties",
                List.of("Italian", "Pasta", "Pizza"), 4.4, 720, 2,
                new GeoLocation(40.7306, -73.9352), 28, 12.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "789 Bedford Ave, Brooklyn, NY", "+1-718-555-0103",
                List.of("Hand-Made Pasta", "Wood-Fired", "Casual"));

        addDish(laTrattoria.getId(), "Fettuccine Alfredo", "Creamy fettuccine with parmesan and butter",
                "Main Course", "Pasta", 15.99, "Regular",
                List.of("Fettuccine", "Butter", "Parmesan", "Cream"),
                List.of("Vegetarian"), 15, 4.5, 312, false, false,
                List.of(), new NutritionalInfo(780, 22, 68, 42, 2, 4, 850, "Regular"));

        addDish(laTrattoria.getId(), "Risotto Mushroom", "Creamy risotto with wild mushrooms and truffle oil",
                "Main Course", "Risotto", 19.99, "Regular",
                List.of("Arborio Rice", "Wild Mushrooms", "Truffle Oil", "Parmesan", "White Wine"),
                List.of("Vegetarian", "Gluten-Free"), 22, 4.6, 234, false, false,
                List.of(), new NutritionalInfo(650, 18, 72, 28, 3, 2, 720, "Regular"));

        // 4-8. More Italian restaurants
        Restaurant ilFornaio = createRestaurant("rest-004", "Il Fornaio",
                "Artisan bread bakery and Italian restaurant",
                List.of("Italian", "Bakery"), 4.3, 560, 2,
                new GeoLocation(40.7489, -73.9680), 25, 10.0, 2.49,
                OperatingHours.lunchAndDinner(),
                "321 Park Ave, New York, NY", "+1-212-555-0104",
                List.of("Fresh Bakery", "Artisan Bread", "Casual"));

        addDish(ilFornaio.getId(), "Focaccia Sandwich", "Italian focaccia with prosciutto and mozzarella",
                "Main Course", "Sandwich", 11.99, "Regular",
                List.of("Focaccia", "Prosciutto", "Mozzarella", "Arugula", "Tomato"),
                List.of(), 10, 4.4, 187, false, false, List.of(), null);

        addDish(ilFornaio.getId(), "Minestrone Soup", "Hearty Italian vegetable soup",
                "Appetizer", "Soup", 7.99, "Bowl",
                List.of("Tomatoes", "Beans", "Zucchini", "Carrots", "Pasta"),
                List.of("Vegan"), 15, 4.3, 156, false, false, List.of(), null);

        Restaurant napoli = createRestaurant("rest-005", "Napoli Express",
                "Quick and authentic Neapolitan-style pizzas",
                List.of("Italian", "Pizza"), 4.1, 430, 1,
                new GeoLocation(40.7614, -73.9776), 20, 8.0, 1.99,
                OperatingHours.allDay(),
                "555 8th Ave, New York, NY", "+1-212-555-0105",
                List.of("Quick Service", "Neapolitan", "Budget Friendly"));

        addDish(napoli.getId(), "Marinara Pizza", "Simple pizza with tomato, garlic, oregano",
                "Main Course", "Pizza", 9.99, "10 inch",
                List.of("Pizza Dough", "Tomato Sauce", "Garlic", "Oregano"),
                List.of("Vegan"), 15, 4.2, 198, false, false, List.of(), null);

        addDish(napoli.getId(), "Calzone", "Folded pizza with ricotta, ham, and mushrooms",
                "Main Course", "Pizza", 11.99, "Regular",
                List.of("Pizza Dough", "Ricotta", "Ham", "Mushrooms"),
                List.of(), 18, 4.3, 165, false, false, List.of(), null);

        Restaurant venetia = createRestaurant("rest-006", "Venetia",
                "Venetian-inspired seafood and pasta dishes",
                List.of("Italian", "Seafood"), 4.6, 380, 3,
                new GeoLocation(40.7282, -74.0776), 40, 25.0, 5.99,
                OperatingHours.dinnerOnly(),
                "77 Hudson St, New York, NY", "+1-212-555-0106",
                List.of("Seafood", "Premium", "Date Night"));

        addDish(venetia.getId(), "Seafood Linguine", "Linguine with shrimp, clams, and mussels in white wine sauce",
                "Main Course", "Pasta", 24.99, "Regular",
                List.of("Linguine", "Shrimp", "Clams", "Mussels", "White Wine", "Garlic"),
                List.of(), 25, 4.8, 234, false, true, List.of(), null);

        addDish(venetia.getId(), "Carpaccio", "Thin-sliced raw beef with arugula and parmesan",
                "Appetizer", "Italian Appetizer", 14.99, "Regular",
                List.of("Beef Tenderloin", "Arugula", "Parmesan", "Lemon", "Olive Oil"),
                List.of("Gluten-Free"), 5, 4.5, 178, false, false, List.of(), null);

        Restaurant roma = createRestaurant("rest-007", "Roma Ristorante",
                "Traditional Roman cuisine with a modern twist",
                List.of("Italian", "Roman"), 4.2, 290, 2,
                new GeoLocation(40.7484, -73.9857), 30, 15.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "200 W 44th St, New York, NY", "+1-212-555-0107",
                List.of("Traditional", "Modern Twist", "Dine-In"));

        addDish(roma.getId(), "Cacio e Pepe", "Roman pasta with pecorino cheese and black pepper",
                "Main Course", "Pasta", 16.99, "Regular",
                List.of("Tonnarelli", "Pecorino Romano", "Black Pepper"),
                List.of("Vegetarian"), 12, 4.5, 267, false, false, List.of(), null);

        Restaurant gelato = createRestaurant("rest-008", "Gelato Dreams",
                "Artisan gelato and Italian desserts",
                List.of("Italian", "Dessert"), 4.8, 670, 1,
                new GeoLocation(40.7291, -73.9965), 15, 5.0, 1.99,
                OperatingHours.lunchAndDinner(),
                "88 University Pl, New York, NY", "+1-212-555-0108",
                List.of("Dessert", "Gelato", "Quick Service"));

        addDish(gelato.getId(), "Pistachio Gelato", "Authentic Sicilian pistachio gelato",
                "Dessert", "Gelato", 5.99, "2 scoops",
                List.of("Milk", "Sugar", "Pistachios"),
                List.of("Vegetarian", "Gluten-Free"), 2, 4.9, 456, false, true, List.of(), null);

        addDish(gelato.getId(), "Affogato", "Vanilla gelato drowned in espresso",
                "Dessert", "Gelato", 6.99, "1 serving",
                List.of("Gelato", "Espresso"),
                List.of("Vegetarian", "Gluten-Free"), 3, 4.7, 345, false, false, List.of(), null);
    }

    // ========== CHINESE RESTAURANTS (6) ==========

    private void generateChineseRestaurants() {
        Restaurant dragonWok = createRestaurant("rest-009", "Dragon Wok",
                "Authentic Chinese cuisine with fiery wok specialties",
                List.of("Chinese", "Asian"), 4.3, 675, 1,
                new GeoLocation(40.7158, -73.9970), 25, 12.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "45 Mott St, New York, NY", "+1-212-555-0109",
                List.of("Wok Cooking", "Spicy", "Authentic"));

        addDish(dragonWok.getId(), "Kung Pao Chicken", "Spicy stir-fried chicken with peanuts and chili peppers",
                "Main Course", "Chinese", 13.99, "Regular",
                List.of("Chicken", "Peanuts", "Chili Peppers", "Soy Sauce", "Ginger"),
                List.of(), 15, 4.5, 389, true, true,
                List.of(new Customization("Spice Level", List.of("Mild", "Medium", "Hot", "Extra Hot"))),
                new NutritionalInfo(520, 32, 28, 26, 3, 8, 1200, "Regular"));

        addDish(dragonWok.getId(), "Fried Rice", "Classic Chinese fried rice with vegetables and egg",
                "Main Course", "Rice", 10.99, "Regular",
                List.of("Rice", "Eggs", "Green Onions", "Peas", "Carrots", "Soy Sauce"),
                List.of("Vegetarian"), 12, 4.3, 312, false, false,
                List.of(new Customization("Protein", List.of("Vegetable", "Chicken", "Shrimp", "Beef"))),
                new NutritionalInfo(480, 12, 65, 15, 3, 4, 980, "Regular"));

        addDish(dragonWok.getId(), "Spring Rolls", "Crispy spring rolls with vegetable filling",
                "Appetizer", "Chinese Appetizer", 5.99, "4 pieces",
                List.of("Spring Roll Wrapper", "Cabbage", "Carrots", "Glass Noodles"),
                List.of("Vegan"), 10, 4.2, 245, false, false,
                List.of(), new NutritionalInfo(280, 6, 38, 12, 2, 3, 420, "4 pieces"));

        addDish(dragonWok.getId(), "Hot and Sour Soup", "Traditional Chinese soup with tofu and mushrooms",
                "Appetizer", "Soup", 6.99, "Bowl",
                List.of("Tofu", "Mushrooms", "Bamboo Shoots", "Vinegar", "White Pepper"),
                List.of("Vegetarian"), 10, 4.4, 198, true, false, List.of(), null);

        addDish(dragonWok.getId(), "Mango Pudding", "Silky mango pudding with fresh mango topping",
                "Dessert", "Chinese Dessert", 5.49, "1 serving",
                List.of("Mango", "Cream", "Sugar", "Gelatin"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.3, 156, false, false, List.of(), null);

        // Beijing House
        Restaurant beijingHouse = createRestaurant("rest-010", "Beijing House",
                "Northern Chinese specialties and Peking duck",
                List.of("Chinese", "Northern Chinese"), 4.5, 820, 2,
                new GeoLocation(40.7580, -73.8855), 35, 15.0, 3.99,
                OperatingHours.lunchAndDinner(),
                "136-20 Roosevelt Ave, Flushing, NY", "+1-718-555-0110",
                List.of("Peking Duck", "Northern Chinese", "Banquet"));

        addDish(beijingHouse.getId(), "Peking Duck", "Crispy roasted duck with pancakes and hoisin sauce",
                "Main Course", "Chinese", 38.99, "Half Duck",
                List.of("Duck", "Pancakes", "Hoisin Sauce", "Scallions", "Cucumber"),
                List.of(), 45, 4.8, 567, false, true, List.of(), null);

        addDish(beijingHouse.getId(), "Mapo Tofu", "Spicy tofu with minced pork in chili bean sauce",
                "Main Course", "Chinese", 12.99, "Regular",
                List.of("Tofu", "Pork", "Chili Bean Paste", "Sichuan Pepper"),
                List.of(), 15, 4.4, 234, true, false, List.of(), null);

        addDish(beijingHouse.getId(), "Dumplings", "Hand-made pork and chive dumplings",
                "Appetizer", "Dumpling", 8.99, "8 pieces",
                List.of("Pork", "Chives", "Flour Wrapper", "Ginger"),
                List.of(), 12, 4.6, 345, false, true, List.of(), null);

        // Szechuan Paradise
        Restaurant szechuanParadise = createRestaurant("rest-011", "Szechuan Paradise",
                "Authentic Szechuan cuisine with bold flavors and numbing spice",
                List.of("Chinese", "Szechuan"), 4.4, 545, 2,
                new GeoLocation(40.7484, -73.9867), 30, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "302 W 46th St, New York, NY", "+1-212-555-0111",
                List.of("Szechuan", "Spicy", "Authentic"));

        addDish(szechuanParadise.getId(), "Dan Dan Noodles", "Spicy noodles with sesame paste and chili oil",
                "Main Course", "Noodles", 12.99, "Regular",
                List.of("Noodles", "Sesame Paste", "Chili Oil", "Pork", "Peanuts"),
                List.of(), 12, 4.5, 278, true, true, List.of(), null);

        addDish(szechuanParadise.getId(), "Szechuan Beef", "Crispy beef with chili peppers and orange peel",
                "Main Course", "Chinese", 16.99, "Regular",
                List.of("Beef", "Chili Peppers", "Orange Peel", "Garlic", "Soy Sauce"),
                List.of(), 18, 4.3, 198, true, false, List.of(), null);

        // Golden Dragon
        Restaurant goldenDragon = createRestaurant("rest-012", "Golden Dragon",
                "Cantonese dim sum and seafood restaurant",
                List.of("Chinese", "Cantonese", "Dim Sum"), 4.6, 710, 2,
                new GeoLocation(40.7148, -73.9980), 30, 15.0, 3.99,
                OperatingHours.lunchAndDinner(),
                "18 Doyers St, New York, NY", "+1-212-555-0112",
                List.of("Dim Sum", "Cantonese", "Seafood"));

        addDish(goldenDragon.getId(), "Har Gow", "Crystal shrimp dumplings",
                "Appetizer", "Dim Sum", 6.99, "4 pieces",
                List.of("Shrimp", "Wheat Starch Wrapper", "Bamboo Shoots"),
                List.of(), 10, 4.7, 345, false, true, List.of(), null);

        addDish(goldenDragon.getId(), "Char Siu Bao", "BBQ pork steamed buns",
                "Appetizer", "Dim Sum", 5.99, "3 pieces",
                List.of("Flour Dough", "BBQ Pork", "Oyster Sauce"),
                List.of(), 12, 4.5, 267, false, false, List.of(), null);

        addDish(goldenDragon.getId(), "Congee", "Rice porridge with century egg and pork",
                "Main Course", "Rice", 8.99, "Bowl",
                List.of("Rice", "Century Egg", "Pork", "Ginger", "Scallions"),
                List.of(), 20, 4.3, 189, false, false, List.of(), null);

        // Wok & Roll
        Restaurant wokAndRoll = createRestaurant("rest-013", "Wok & Roll",
                "Modern Chinese fusion with creative twists",
                List.of("Chinese", "Fusion"), 4.1, 320, 1,
                new GeoLocation(40.7310, -73.9892), 22, 10.0, 2.49,
                OperatingHours.lunchAndDinner(),
                "11 Waverly Pl, New York, NY", "+1-212-555-0113",
                List.of("Fusion", "Modern", "Quick Service"));

        addDish(wokAndRoll.getId(), "Orange Chicken", "Crispy chicken with sweet orange glaze",
                "Main Course", "Chinese", 12.99, "Regular",
                List.of("Chicken", "Orange Juice", "Soy Sauce", "Ginger"),
                List.of(), 15, 4.2, 234, false, false, List.of(), null);

        addDish(wokAndRoll.getId(), "Lo Mein", "Stir-fried noodles with vegetables",
                "Main Course", "Noodles", 11.99, "Regular",
                List.of("Egg Noodles", "Cabbage", "Carrots", "Bean Sprouts", "Soy Sauce"),
                List.of("Vegetarian"), 12, 4.0, 178, false, false, List.of(), null);

        // Jade Garden
        Restaurant jadeGarden = createRestaurant("rest-014", "Jade Garden",
                "Elegant Chinese dining with traditional ambiance",
                List.of("Chinese", "Cantonese"), 4.2, 410, 3,
                new GeoLocation(40.7593, -73.9842), 35, 20.0, 4.99,
                OperatingHours.dinnerOnly(),
                "50 W 56th St, New York, NY", "+1-212-555-0114",
                List.of("Elegant", "Traditional", "Premium"));

        addDish(jadeGarden.getId(), "Lobster Cantonese", "Wok-fried lobster with ginger and scallions",
                "Main Course", "Seafood", 42.99, "Whole Lobster",
                List.of("Lobster", "Ginger", "Scallions", "Soy Sauce"),
                List.of("Gluten-Free"), 25, 4.7, 189, false, true, List.of(), null);

        addDish(jadeGarden.getId(), "Crispy Wonton", "Deep-fried wontons with sweet chili sauce",
                "Appetizer", "Chinese Appetizer", 7.99, "6 pieces",
                List.of("Wonton Wrapper", "Pork", "Shrimp", "Cream Cheese"),
                List.of(), 8, 4.3, 156, false, false, List.of(), null);
    }

    // ========== INDIAN RESTAURANTS (7) ==========

    private void generateIndianRestaurants() {
        Restaurant spiceGarden = createRestaurant("rest-015", "Spice Garden",
                "Rich and aromatic Indian cuisine with tandoor specialties",
                List.of("Indian", "North Indian"), 4.6, 1020, 2,
                new GeoLocation(40.7282, -73.9942), 40, 15.0, 3.99,
                OperatingHours.lunchAndDinner(),
                "101 E 6th St, New York, NY", "+1-212-555-0115",
                List.of("Tandoor", "Spicy", "Vegetarian Friendly"));

        addDish(spiceGarden.getId(), "Butter Chicken", "Creamy tomato-based curry with tender chicken",
                "Main Course", "Curry", 15.99, "Regular",
                List.of("Chicken", "Tomatoes", "Cream", "Butter", "Spices"),
                List.of(), 20, 4.8, 567, true, true,
                List.of(new Customization("Spice Level", List.of("Mild", "Medium", "Hot"))),
                new NutritionalInfo(550, 35, 18, 35, 2, 8, 900, "Regular"));

        addDish(spiceGarden.getId(), "Chicken Biryani", "Fragrant basmati rice with spiced chicken and saffron",
                "Main Course", "Rice", 16.99, "Regular",
                List.of("Basmati Rice", "Chicken", "Saffron", "Yogurt", "Fried Onions", "Spices"),
                List.of(), 30, 4.7, 489, true, true, List.of(), null);

        addDish(spiceGarden.getId(), "Garlic Naan", "Soft naan bread with garlic and butter",
                "Side", "Bread", 3.99, "1 piece",
                List.of("Flour", "Garlic", "Butter", "Yogurt"),
                List.of("Vegetarian"), 8, 4.5, 356, false, false, List.of(), null);

        addDish(spiceGarden.getId(), "Samosa", "Crispy pastry filled with spiced potatoes and peas",
                "Appetizer", "Indian Appetizer", 4.99, "2 pieces",
                List.of("Flour", "Potatoes", "Peas", "Cumin", "Coriander"),
                List.of("Vegan"), 10, 4.4, 312, false, false, List.of(), null);

        addDish(spiceGarden.getId(), "Gulab Jamun", "Sweet milk dumplings in rose-flavored syrup",
                "Dessert", "Indian Dessert", 4.99, "3 pieces",
                List.of("Milk Powder", "Sugar", "Rose Water", "Cardamom"),
                List.of("Vegetarian"), 5, 4.6, 267, false, false, List.of(), null);

        addDish(spiceGarden.getId(), "Mango Lassi", "Creamy mango yogurt drink",
                "Beverage", "Indian Beverage", 4.99, "Regular",
                List.of("Yogurt", "Mango Pulp", "Sugar", "Cardamom"),
                List.of("Vegetarian", "Gluten-Free"), 3, 4.7, 389, false, false, List.of(), null);

        // Curry House
        Restaurant curryHouse = createRestaurant("rest-016", "Curry House",
                "Southern Indian dosas and curries",
                List.of("Indian", "South Indian"), 4.4, 680, 1,
                new GeoLocation(40.7440, -73.9820), 30, 10.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "118 Lexington Ave, New York, NY", "+1-212-555-0116",
                List.of("South Indian", "Dosa", "Budget Friendly"));

        addDish(curryHouse.getId(), "Masala Dosa", "Crispy rice crepe filled with spiced potatoes",
                "Main Course", "Dosa", 11.99, "Regular",
                List.of("Rice Batter", "Potatoes", "Onions", "Mustard Seeds", "Curry Leaves"),
                List.of("Vegan", "Gluten-Free"), 15, 4.5, 345, false, true, List.of(), null);

        addDish(curryHouse.getId(), "Idli Sambar", "Steamed rice cakes with lentil soup",
                "Main Course", "South Indian", 8.99, "4 pieces",
                List.of("Rice Batter", "Lentils", "Vegetables", "Tamarind"),
                List.of("Vegan", "Gluten-Free"), 12, 4.3, 234, false, false, List.of(), null);

        addDish(curryHouse.getId(), "Chicken Chettinad", "Fiery South Indian chicken curry",
                "Main Course", "Curry", 14.99, "Regular",
                List.of("Chicken", "Black Pepper", "Fennel", "Coconut", "Curry Leaves"),
                List.of(), 20, 4.6, 198, true, false, List.of(), null);

        // Tandoor Nights
        Restaurant tandoorNights = createRestaurant("rest-017", "Tandoor Nights",
                "Premium tandoori grills and Mughlai cuisine",
                List.of("Indian", "Mughlai", "Tandoori"), 4.5, 560, 3,
                new GeoLocation(40.7580, -73.9195), 45, 20.0, 4.99,
                OperatingHours.dinnerOnly(),
                "72 Jackson Ave, Long Island City, NY", "+1-718-555-0117",
                List.of("Tandoori", "Premium", "Mughlai"));

        addDish(tandoorNights.getId(), "Tandoori Chicken", "Marinated chicken roasted in clay oven",
                "Main Course", "Tandoori", 16.99, "Half",
                List.of("Chicken", "Yogurt", "Tandoori Masala", "Lemon"),
                List.of("Gluten-Free"), 25, 4.7, 345, true, true, List.of(), null);

        addDish(tandoorNights.getId(), "Lamb Rogan Josh", "Rich Kashmiri lamb curry",
                "Main Course", "Curry", 19.99, "Regular",
                List.of("Lamb", "Yogurt", "Kashmiri Chilies", "Fennel", "Ginger"),
                List.of("Gluten-Free"), 30, 4.6, 267, true, false, List.of(), null);

        addDish(tandoorNights.getId(), "Dal Makhani", "Slow-cooked black lentils with cream and butter",
                "Main Course", "Curry", 12.99, "Regular",
                List.of("Black Lentils", "Cream", "Butter", "Tomatoes", "Spices"),
                List.of("Vegetarian"), 25, 4.5, 234, false, false, List.of(), null);

        // Bombay Bites
        Restaurant bombayBites = createRestaurant("rest-018", "Bombay Bites",
                "Mumbai street food and chaat specialties",
                List.of("Indian", "Street Food"), 4.2, 430, 1,
                new GeoLocation(40.7454, -73.9784), 20, 8.0, 1.99,
                OperatingHours.lunchAndDinner(),
                "240 E 28th St, New York, NY", "+1-212-555-0118",
                List.of("Street Food", "Quick Service", "Budget"));

        addDish(bombayBites.getId(), "Pav Bhaji", "Spiced vegetable mash with buttered bread rolls",
                "Main Course", "Street Food", 8.99, "Regular",
                List.of("Mixed Vegetables", "Butter", "Pav Bhaji Masala", "Bread Rolls"),
                List.of("Vegetarian"), 12, 4.3, 234, true, true, List.of(), null);

        addDish(bombayBites.getId(), "Vada Pav", "Mumbai's iconic spiced potato burger",
                "Main Course", "Street Food", 5.99, "1 piece",
                List.of("Potato Vada", "Bread Roll", "Garlic Chutney", "Green Chutney"),
                List.of("Vegetarian"), 8, 4.4, 312, true, false, List.of(), null);

        addDish(bombayBites.getId(), "Bhel Puri", "Puffed rice with chutneys and vegetables",
                "Appetizer", "Chaat", 5.49, "Regular",
                List.of("Puffed Rice", "Onions", "Tomatoes", "Chutneys", "Sev"),
                List.of("Vegan"), 5, 4.1, 178, false, false, List.of(), null);

        // Saffron
        Restaurant saffron = createRestaurant("rest-019", "Saffron",
                "Fine dining Indian restaurant with contemporary presentations",
                List.of("Indian", "Fine Dining"), 4.7, 340, 4,
                new GeoLocation(40.7614, -73.9676), 50, 30.0, 5.99,
                OperatingHours.dinnerOnly(),
                "320 E 58th St, New York, NY", "+1-212-555-0119",
                List.of("Fine Dining", "Premium", "Contemporary"));

        addDish(saffron.getId(), "Lamb Shank Nihari", "Slow-braised lamb shank in aromatic spices",
                "Main Course", "Curry", 28.99, "Regular",
                List.of("Lamb Shank", "Fried Onions", "Ginger", "Nihari Masala"),
                List.of("Gluten-Free"), 35, 4.8, 189, true, true, List.of(), null);

        addDish(saffron.getId(), "Paneer Tikka", "Grilled cottage cheese with bell peppers",
                "Appetizer", "Tandoori", 13.99, "Regular",
                List.of("Paneer", "Bell Peppers", "Yogurt", "Tikka Masala"),
                List.of("Vegetarian", "Gluten-Free"), 15, 4.6, 245, true, false, List.of(), null);

        // Chai & Chutney
        Restaurant chaiChutney = createRestaurant("rest-020", "Chai & Chutney",
                "Cozy tea house with Indian snacks and chai",
                List.of("Indian", "Cafe"), 4.3, 290, 1,
                new GeoLocation(40.7355, -73.9905), 15, 5.0, 1.49,
                OperatingHours.brunchAndLunch(),
                "55 Irving Pl, New York, NY", "+1-212-555-0120",
                List.of("Tea House", "Snacks", "Cozy"));

        addDish(chaiChutney.getId(), "Masala Chai", "Spiced Indian tea with milk",
                "Beverage", "Tea", 3.99, "Regular",
                List.of("Black Tea", "Milk", "Ginger", "Cardamom", "Cinnamon"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.7, 456, false, true, List.of(), null);

        addDish(chaiChutney.getId(), "Pakora Platter", "Assorted vegetable fritters",
                "Appetizer", "Indian Appetizer", 6.99, "8 pieces",
                List.of("Chickpea Flour", "Onions", "Spinach", "Potatoes"),
                List.of("Vegan"), 10, 4.3, 198, true, false, List.of(), null);

        // Spice Route
        Restaurant spiceRoute = createRestaurant("rest-021", "Spice Route",
                "Pan-Indian cuisine from all regions of India",
                List.of("Indian", "Pan-Indian"), 4.4, 510, 2,
                new GeoLocation(40.7420, -73.9880), 35, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "175 2nd Ave, New York, NY", "+1-212-555-0121",
                List.of("Pan-Indian", "All Regions", "Diverse Menu"));

        addDish(spiceRoute.getId(), "Palak Paneer", "Cottage cheese in creamy spinach gravy",
                "Main Course", "Curry", 13.99, "Regular",
                List.of("Paneer", "Spinach", "Cream", "Onions", "Spices"),
                List.of("Vegetarian", "Gluten-Free"), 18, 4.5, 267, false, false, List.of(), null);

        addDish(spiceRoute.getId(), "Fish Curry", "Kerala-style fish curry with coconut milk",
                "Main Course", "Curry", 17.99, "Regular",
                List.of("Fish", "Coconut Milk", "Tamarind", "Curry Leaves"),
                List.of("Gluten-Free"), 20, 4.4, 198, true, false, List.of(), null);
    }

    // ========== FAST FOOD RESTAURANTS (5) ==========

    private void generateFastFoodRestaurants() {
        Restaurant burgerKing = createRestaurant("rest-022", "Burger Barn",
                "Flame-grilled burgers and crispy fries",
                List.of("Fast Food", "Burgers"), 3.8, 2100, 1,
                new GeoLocation(40.7520, -73.9870), 20, 5.0, 1.99,
                OperatingHours.allDay(),
                "500 7th Ave, New York, NY", "+1-212-555-0122",
                List.of("Fast Food", "Drive-Thru", "24/7"));

        addDish(burgerKing.getId(), "Classic Burger", "Flame-grilled beef patty with lettuce, tomato, and pickles",
                "Main Course", "Burger", 7.99, "Regular",
                List.of("Beef Patty", "Lettuce", "Tomato", "Pickles", "Bun"),
                List.of(), 8, 4.0, 567, false, true, List.of(), null);

        addDish(burgerKing.getId(), "Chicken Sandwich", "Crispy chicken breast sandwich",
                "Main Course", "Sandwich", 6.99, "Regular",
                List.of("Chicken Breast", "Lettuce", "Mayo", "Bun"),
                List.of(), 7, 3.9, 345, false, false, List.of(), null);

        addDish(burgerKing.getId(), "French Fries", "Golden crispy french fries",
                "Side", "Fries", 3.99, "Medium",
                List.of("Potatoes", "Salt", "Oil"),
                List.of("Vegan", "Gluten-Free"), 5, 4.1, 678, false, false,
                List.of(new Customization("Size", List.of("Small", "Medium", "Large"))), null);

        addDish(burgerKing.getId(), "Milkshake", "Thick creamy milkshake",
                "Beverage", "Shake", 4.99, "Medium",
                List.of("Ice Cream", "Milk", "Flavoring"),
                List.of("Vegetarian"), 3, 4.2, 234,false, false,
                List.of(new Customization("Flavor", List.of("Chocolate", "Vanilla", "Strawberry"))), null);

        // KFC Style
        Restaurant kfcStyle = createRestaurant("rest-023", "Crispy Chicken Co.",
                "Crispy fried chicken and southern-style sides",
                List.of("Fast Food", "Chicken"), 3.9, 1800, 1,
                new GeoLocation(40.7580, -73.9780), 22, 5.0, 1.99,
                OperatingHours.allDay(),
                "620 8th Ave, New York, NY", "+1-212-555-0123",
                List.of("Fried Chicken", "Fast Food", "Southern"));

        addDish(kfcStyle.getId(), "Original Fried Chicken", "Crispy fried chicken with secret spices",
                "Main Course", "Chicken", 10.99, "3 pieces",
                List.of("Chicken", "Flour", "Secret Spices", "Oil"),
                List.of(), 12, 4.2, 567, false, true, List.of(), null);

        addDish(kfcStyle.getId(), "Chicken Wings", "Spicy buffalo chicken wings",
                "Appetizer", "Chicken", 8.99, "6 pieces",
                List.of("Chicken Wings", "Buffalo Sauce", "Butter"),
                List.of("Gluten-Free"), 10, 4.3, 345, true, false, List.of(), null);

        addDish(kfcStyle.getId(), "Coleslaw", "Creamy coleslaw with cabbage and carrots",
                "Side", "Salad", 3.49, "Regular",
                List.of("Cabbage", "Carrots", "Mayonnaise", "Vinegar"),
                List.of("Vegetarian", "Gluten-Free"), 2, 3.8, 178, false, false, List.of(), null);

        // McDonald's Style
        Restaurant mcStyle = createRestaurant("rest-024", "Golden Arches Diner",
                "Quick-service burgers, breakfast, and happy meals",
                List.of("Fast Food", "Burgers", "Breakfast"), 3.7, 2500, 1,
                new GeoLocation(40.7484, -73.9857), 15, 3.0, 0.99,
                OperatingHours.allDay(),
                "1560 Broadway, New York, NY", "+1-212-555-0124",
                List.of("Fast Food", "Breakfast", "Kids Menu"));

        addDish(mcStyle.getId(), "Big Mac Style Burger", "Double beef patty with special sauce",
                "Main Course", "Burger", 8.99, "Regular",
                List.of("Beef Patties", "Special Sauce", "Lettuce", "Cheese", "Pickles", "Onions", "Sesame Bun"),
                List.of(), 5, 4.0, 789, false, true, List.of(), null);

        addDish(mcStyle.getId(), "Chicken Nuggets", "Crispy breaded chicken nuggets",
                "Main Course", "Chicken", 6.99, "10 pieces",
                List.of("Chicken", "Breadcrumbs", "Oil"),
                List.of(), 5, 4.1, 567, false, true,
                List.of(new Customization("Sauce", List.of("BBQ", "Honey Mustard", "Sweet & Sour", "Ranch"))), null);

        addDish(mcStyle.getId(), "Hash Browns", "Crispy golden hash brown patty",
                "Side", "Breakfast", 2.49, "1 piece",
                List.of("Potatoes", "Salt", "Oil"),
                List.of("Vegan"), 3, 3.9, 345, false, false, List.of(), null);

        // Subway Style
        Restaurant subwayStyle = createRestaurant("rest-025", "Sub Station",
                "Fresh custom-made submarines and wraps",
                List.of("Fast Food", "Sandwiches"), 4.0, 1200, 1,
                new GeoLocation(40.7510, -73.9820), 18, 5.0, 1.49,
                OperatingHours.lunchAndDinner(),
                "340 Madison Ave, New York, NY", "+1-212-555-0125",
                List.of("Custom Subs", "Fresh", "Healthy Options"));

        addDish(subwayStyle.getId(), "Italian BMT Sub", "Italian salami, pepperoni, and ham sub",
                "Main Course", "Sandwich", 9.99, "6 inch",
                List.of("Italian Bread", "Salami", "Pepperoni", "Ham", "Cheese"),
                List.of(), 5, 4.1, 345, false, true, List.of(), null);

        addDish(subwayStyle.getId(), "Veggie Delight Sub", "Fresh vegetables with choice of dressing",
                "Main Course", "Sandwich", 7.99, "6 inch",
                List.of("Bread", "Lettuce", "Tomato", "Cucumber", "Onions", "Olives"),
                List.of("Vegan"), 5, 3.9, 234, false, false, List.of(), null);

        addDish(subwayStyle.getId(), "Chocolate Chip Cookie", "Freshly baked chocolate chip cookie",
                "Dessert", "Cookie", 1.99, "1 piece",
                List.of("Flour", "Butter", "Sugar", "Chocolate Chips"),
                List.of("Vegetarian"), 2, 4.0, 456, false, false, List.of(), null);

        // Wendy's Style
        Restaurant wendyStyle = createRestaurant("rest-026", "Square Patty",
                "Fresh, never frozen square beef patties",
                List.of("Fast Food", "Burgers"), 4.0, 950, 1,
                new GeoLocation(40.7557, -73.9862), 20, 5.0, 1.99,
                OperatingHours.lunchAndDinner(),
                "200 W 49th St, New York, NY", "+1-212-555-0126",
                List.of("Fresh Beef", "Quality", "Value"));

        addDish(wendyStyle.getId(), "Baconator", "Double beef patty with bacon and cheese",
                "Main Course", "Burger", 9.99, "Regular",
                List.of("Beef Patties", "Bacon", "Cheese", "Mayo", "Ketchup"),
                List.of(), 7, 4.2, 312, false, true, List.of(), null);

        addDish(wendyStyle.getId(), "Chili", "Hearty beef chili with beans",
                "Side", "Soup", 4.99, "Regular",
                List.of("Beef", "Kidney Beans", "Tomatoes", "Onions", "Chili Powder"),
                List.of("Gluten-Free"), 5, 4.0, 234, true, false, List.of(), null);

        addDish(wendyStyle.getId(), "Frosty", "Classic chocolate frosty dessert",
                "Dessert", "Frozen Dessert", 3.99, "Medium",
                List.of("Milk", "Cream", "Sugar", "Cocoa"),
                List.of("Vegetarian"), 2, 4.3, 567, false, true, List.of(), null);
    }

    // ========== JAPANESE RESTAURANTS (6) ==========

    private void generateJapaneseRestaurants() {
        Restaurant sushiMaster = createRestaurant("rest-027", "Sushi Master",
                "Premium sushi and sashimi prepared by master chefs",
                List.of("Japanese", "Sushi"), 4.8, 1500, 3,
                new GeoLocation(40.7614, -73.9776), 45, 25.0, 5.99,
                OperatingHours.lunchAndDinner(),
                "141 W 51st St, New York, NY", "+1-212-555-0127",
                List.of("Premium Sushi", "Master Chef", "Fresh Fish"));

        addDish(sushiMaster.getId(), "Salmon Sushi", "Fresh Atlantic salmon nigiri sushi",
                "Main Course", "Sushi", 8.99, "2 pieces",
                List.of("Sushi Rice", "Salmon", "Wasabi"),
                List.of("Gluten-Free"), 5, 4.9, 567, false, true, List.of(), null);

        addDish(sushiMaster.getId(), "California Roll", "Crab, avocado, and cucumber roll",
                "Main Course", "Sushi Roll", 12.99, "8 pieces",
                List.of("Sushi Rice", "Crab", "Avocado", "Cucumber", "Nori"),
                List.of(), 10, 4.7, 489, false, true, List.of(), null);

        addDish(sushiMaster.getId(), "Miso Soup", "Traditional miso soup with tofu and seaweed",
                "Appetizer", "Soup", 4.99, "Bowl",
                List.of("Miso Paste", "Tofu", "Wakame", "Scallions"),
                List.of("Vegan"), 5, 4.5, 345, false, false, List.of(), null);

        addDish(sushiMaster.getId(), "Edamame", "Steamed soybeans with sea salt",
                "Appetizer", "Japanese Appetizer", 5.49, "Regular",
                List.of("Soybeans", "Sea Salt"),
                List.of("Vegan", "Gluten-Free"), 5, 4.3, 267, false, false, List.of(), null);

        addDish(sushiMaster.getId(), "Mochi Ice Cream", "Japanese rice cake ice cream",
                "Dessert", "Japanese Dessert", 5.99, "3 pieces",
                List.of("Mochi", "Ice Cream"),
                List.of("Vegetarian"), 2, 4.6, 345, false, false,
                List.of(new Customization("Flavor", List.of("Green Tea", "Mango", "Strawberry"))), null);

        // Tokyo Kitchen
        Restaurant tokyoKitchen = createRestaurant("rest-028", "Tokyo Kitchen",
                "Casual Japanese dining with ramen and donburi",
                List.of("Japanese", "Ramen"), 4.5, 890, 2,
                new GeoLocation(40.7291, -73.9866), 30, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "60 E 10th St, New York, NY", "+1-212-555-0128",
                List.of("Ramen", "Casual", "Authentic"));

        addDish(tokyoKitchen.getId(), "Tonkotsu Ramen", "Rich pork bone broth ramen with chashu pork",
                "Main Course", "Ramen", 15.99, "Regular",
                List.of("Ramen Noodles", "Pork Broth", "Chashu Pork", "Soft Egg", "Nori", "Scallions"),
                List.of(), 15, 4.8, 567, false, true, List.of(), null);

        addDish(tokyoKitchen.getId(), "Chicken Katsu Curry", "Crispy chicken cutlet with Japanese curry",
                "Main Course", "Curry", 14.99, "Regular",
                List.of("Chicken", "Panko", "Japanese Curry", "Rice"),
                List.of(), 12, 4.5, 345, false, false, List.of(), null);

        addDish(tokyoKitchen.getId(), "Gyoza", "Pan-fried pork dumplings",
                "Appetizer", "Japanese Appetizer", 7.99, "6 pieces",
                List.of("Pork", "Cabbage", "Ginger", "Garlic", "Wrapper"),
                List.of(), 10, 4.6, 389, false, true, List.of(), null);

        // Ramen House
        Restaurant ramenHouse = createRestaurant("rest-029", "Ramen House",
                "Authentic Japanese ramen with house-made noodles",
                List.of("Japanese", "Ramen"), 4.6, 720, 2,
                new GeoLocation(40.7267, -73.9901), 25, 10.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "25 St Marks Pl, New York, NY", "+1-212-555-0129",
                List.of("Hand-Made Noodles", "Ramen", "Authentic"));

        addDish(ramenHouse.getId(), "Shoyu Ramen", "Soy sauce-based broth ramen",
                "Main Course", "Ramen", 14.99, "Regular",
                List.of("Hand-Made Noodles", "Soy Broth", "Chashu", "Menma", "Nori"),
                List.of(), 15, 4.7, 456, false, true, List.of(), null);

        addDish(ramenHouse.getId(), "Miso Ramen", "Miso-based broth with corn and butter",
                "Main Course", "Ramen", 15.99, "Regular",
                List.of("Noodles", "Miso Broth", "Corn", "Butter", "Bean Sprouts"),
                List.of(), 15, 4.6, 389, false, false, List.of(), null);

        // Sakura
        Restaurant sakura = createRestaurant("rest-030", "Sakura Sushi Bar",
                "Intimate sushi bar with omakase experience",
                List.of("Japanese", "Sushi", "Omakase"), 4.9, 320, 4,
                new GeoLocation(40.7614, -73.9676), 50, 50.0, 0.0,
                OperatingHours.dinnerOnly(),
                "15 E 47th St, New York, NY", "+1-212-555-0130",
                List.of("Omakase", "Premium", "Intimate"));

        addDish(sakura.getId(), "Omakase Course", "Chef's choice 12-piece sushi selection",
                "Main Course", "Sushi", 89.99, "12 pieces",
                List.of("Seasonal Fish", "Sushi Rice", "Wasabi", "Ginger"),
                List.of("Gluten-Free"), 30, 4.9, 189, false, true, List.of(), null);

        addDish(sakura.getId(), "Wagyu Beef Sashimi", "Premium A5 Wagyu beef sashimi",
                "Appetizer", "Sashimi", 35.99, "5 slices",
                List.of("A5 Wagyu Beef", "Ponzu", "Radish"),
                List.of("Gluten-Free"), 5, 4.9, 145, false, true, List.of(), null);

        // Izakaya Tanuki
        Restaurant izakaya = createRestaurant("rest-031", "Izakaya Tanuki",
                "Casual Japanese pub with small plates and sake",
                List.of("Japanese", "Izakaya"), 4.3, 480, 2,
                new GeoLocation(40.7303, -73.9905), 25, 10.0, 2.99,
                OperatingHours.dinnerOnly(),
                "70 3rd Ave, New York, NY", "+1-212-555-0131",
                List.of("Izakaya", "Small Plates", "Sake"));

        addDish(izakaya.getId(), "Yakitori Platter", "Grilled chicken skewers with tare sauce",
                "Main Course", "Grill", 13.99, "5 skewers",
                List.of("Chicken", "Tare Sauce", "Scallions"),
                List.of("Gluten-Free"), 12, 4.4, 234, false, true, List.of(), null);

        addDish(izakaya.getId(), "Takoyaki", "Crispy octopus balls with bonito flakes",
                "Appetizer", "Japanese Appetizer", 8.99, "6 pieces",
                List.of("Octopus", "Batter", "Bonito Flakes", "Takoyaki Sauce"),
                List.of(), 10, 4.5, 198, false, false, List.of(), null);

        addDish(izakaya.getId(), "Japanese Highball", "Whisky soda with lemon",
                "Beverage", "Cocktail", 9.99, "Regular",
                List.of("Japanese Whisky", "Soda Water", "Lemon"),
                List.of("Vegan", "Gluten-Free"), 3, 4.3, 156, false, false, List.of(), null);

        // Tempura Ten
        Restaurant tempuraTen = createRestaurant("rest-032", "Tempura Ten",
                "Crispy light tempura and Japanese comfort food",
                List.of("Japanese", "Tempura"), 4.4, 380, 2,
                new GeoLocation(40.7484, -73.9857), 30, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "18 W 45th St, New York, NY", "+1-212-555-0132",
                List.of("Tempura", "Comfort Food", "Light"));

        addDish(tempuraTen.getId(), "Shrimp Tempura", "Light and crispy shrimp tempura",
                "Main Course", "Tempura", 16.99, "6 pieces",
                List.of("Shrimp", "Tempura Batter", "Tentsuyu Sauce"),
                List.of(), 10, 4.6, 267, false, true, List.of(), null);

        addDish(tempuraTen.getId(), "Vegetable Tempura", "Assorted vegetable tempura",
                "Main Course", "Tempura", 12.99, "8 pieces",
                List.of("Sweet Potato", "Eggplant", "Shiso", "Green Beans", "Tempura Batter"),
                List.of("Vegan"), 10, 4.4, 198, false, false, List.of(), null);

        addDish(tempuraTen.getId(), "Green Tea Ice Cream", "Matcha green tea ice cream",
                "Dessert", "Japanese Dessert", 4.99, "2 scoops",
                List.of("Cream", "Sugar", "Matcha"),
                List.of("Vegetarian", "Gluten-Free"), 2, 4.5, 234, false, false, List.of(), null);
    }

    // ========== MEXICAN RESTAURANTS (5) ==========

    private void generateMexicanRestaurants() {
        Restaurant elSombrero = createRestaurant("rest-033", "El Sombrero",
                "Authentic Mexican cuisine with handmade tortillas",
                List.of("Mexican", "Latin American"), 4.4, 780, 2,
                new GeoLocation(40.7241, -73.9971), 30, 12.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "108 Rivington St, New York, NY", "+1-212-555-0133",
                List.of("Authentic", "Handmade Tortillas", "Margaritas"));

        addDish(elSombrero.getId(), "Carne Asada Tacos", "Grilled steak tacos with cilantro and onion",
                "Main Course", "Tacos", 13.99, "3 tacos",
                List.of("Steak", "Corn Tortillas", "Cilantro", "Onion", "Lime"),
                List.of("Gluten-Free"), 12, 4.6, 345, false, true, List.of(), null);

        addDish(elSombrero.getId(), "Chicken Burrito", "Loaded burrito with rice, beans, and cheese",
                "Main Course", "Burrito", 11.99, "Regular",
                List.of("Flour Tortilla", "Chicken", "Rice", "Beans", "Cheese", "Salsa"),
                List.of(), 10, 4.3, 267, false, false, List.of(), null);

        addDish(elSombrero.getId(), "Guacamole", "Fresh handmade guacamole with chips",
                "Appetizer", "Mexican Appetizer", 8.99, "Regular",
                List.of("Avocado", "Lime", "Cilantro", "Onion", "Jalapeno", "Tomato"),
                List.of("Vegan", "Gluten-Free"), 5, 4.7, 456, false, true, List.of(), null);

        addDish(elSombrero.getId(), "Churros", "Crispy churros with chocolate dipping sauce",
                "Dessert", "Mexican Dessert", 5.49, "4 pieces",
                List.of("Flour", "Sugar", "Cinnamon", "Chocolate Sauce"),
                List.of("Vegetarian"), 8, 4.5, 234, false, false, List.of(), null);

        // Mexican Fiesta
        Restaurant mexicanFiesta = createRestaurant("rest-034", "Mexican Fiesta",
                "Vibrant Mexican cantina with live mariachi music",
                List.of("Mexican"), 4.2, 560, 2,
                new GeoLocation(40.7580, -73.9855), 35, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "304 W 47th St, New York, NY", "+1-212-555-0134",
                List.of("Live Music", "Cantina", "Margaritas"));

        addDish(mexicanFiesta.getId(), "Enchiladas", "Chicken enchiladas with red sauce and cheese",
                "Main Course", "Mexican", 12.99, "3 enchiladas",
                List.of("Corn Tortillas", "Chicken", "Red Sauce", "Cheese", "Sour Cream"),
                List.of(), 15, 4.3, 234, true, false, List.of(), null);

        addDish(mexicanFiesta.getId(), "Nachos Supreme", "Loaded nachos with all the toppings",
                "Appetizer", "Mexican Appetizer", 10.99, "Large",
                List.of("Tortilla Chips", "Cheese", "Jalapenos", "Beans", "Sour Cream", "Guacamole"),
                List.of("Vegetarian"), 8, 4.2, 312, true, false, List.of(), null);

        addDish(mexicanFiesta.getId(), "Margarita", "Classic lime margarita",
                "Beverage", "Cocktail", 10.99, "Regular",
                List.of("Tequila", "Lime", "Triple Sec", "Salt"),
                List.of("Vegan", "Gluten-Free"), 3, 4.4, 234, false, false, List.of(), null);

        // Taco Loco
        Restaurant tacoLoco = createRestaurant("rest-035", "Taco Loco",
                "Quick-service taco shop with generous portions",
                List.of("Mexican", "Tacos"), 4.0, 1100, 1,
                new GeoLocation(40.7420, -73.9880), 20, 8.0, 1.99,
                OperatingHours.lunchAndDinner(),
                "245 E 14th St, New York, NY", "+1-212-555-0135",
                List.of("Quick Service", "Budget", "Generous Portions"));

        addDish(tacoLoco.getId(), "Fish Tacos", "Beer-battered fish tacos with cabbage slaw",
                "Main Course", "Tacos", 11.99, "3 tacos",
                List.of("Fish", "Cabbage", "Crema", "Corn Tortillas"),
                List.of(), 10, 4.1, 278, false, true, List.of(), null);

        addDish(tacoLoco.getId(), "Quesadilla", "Cheese quesadilla with choice of protein",
                "Main Course", "Mexican", 8.99, "Regular",
                List.of("Flour Tortilla", "Cheese"),
                List.of("Vegetarian"), 8, 4.0, 234,false, false,
                List.of(new Customization("Protein", List.of("Cheese Only", "Chicken", "Steak", "Carnitas"))), null);

        // Oaxaca Grill
        Restaurant oaxacaGrill = createRestaurant("rest-036", "Oaxaca Grill",
                "Oaxacan specialties with mole and mezcal",
                List.of("Mexican", "Oaxacan"), 4.5, 340, 3,
                new GeoLocation(40.7310, -73.9850), 40, 18.0, 4.99,
                OperatingHours.dinnerOnly(),
                "95 Ave A, New York, NY", "+1-212-555-0136",
                List.of("Oaxacan", "Mole", "Mezcal"));

        addDish(oaxacaGrill.getId(), "Mole Negro", "Chicken in complex black mole sauce",
                "Main Course", "Mexican", 18.99, "Regular",
                List.of("Chicken", "Mole Negro", "Rice", "Beans"),
                List.of("Gluten-Free"), 25, 4.7, 189, true, true, List.of(), null);

        addDish(oaxacaGrill.getId(), "Tlayuda", "Oaxacan pizza with beans, cheese, and meat",
                "Main Course", "Mexican", 14.99, "Regular",
                List.of("Corn Tortilla", "Refried Beans", "Oaxaca Cheese", "Asiento"),
                List.of(), 15, 4.5, 167, false, false, List.of(), null);

        // Burrito Express
        Restaurant burritoExpress = createRestaurant("rest-037", "Burrito Express",
                "Fast burrito bowls and wraps",
                List.of("Mexican", "Fast Casual"), 3.9, 890, 1,
                new GeoLocation(40.7557, -73.9782), 15, 8.0, 1.49,
                OperatingHours.lunchAndDinner(),
                "630 9th Ave, New York, NY", "+1-212-555-0137",
                List.of("Fast Casual", "Bowls", "Customizable"));

        addDish(burritoExpress.getId(), "Burrito Bowl", "Rice bowl with choice of protein and toppings",
                "Main Course", "Bowl", 10.99, "Regular",
                List.of("Rice", "Beans", "Lettuce", "Salsa", "Sour Cream"),
                List.of(),  8, 4.0, 456, false, true,
                List.of(new Customization("Protein", List.of("Chicken", "Steak", "Carnitas", "Sofritas"))), null);

        addDish(burritoExpress.getId(), "Chips and Salsa", "Crispy tortilla chips with fresh salsa",
                "Appetizer", "Mexican Appetizer", 3.99, "Regular",
                List.of("Corn Tortillas", "Tomatoes", "Onions", "Cilantro", "Lime"),
                List.of("Vegan", "Gluten-Free"), 3, 3.8, 345, false, false, List.of(), null);
    }

    // ========== THAI RESTAURANTS (4) ==========

    private void generateThaiRestaurants() {
        Restaurant thaiBasil = createRestaurant("rest-038", "Thai Basil",
                "Authentic Thai cuisine with fresh herbs and bold flavors",
                List.of("Thai", "Asian"), 4.5, 640, 2,
                new GeoLocation(40.7267, -73.9850), 30, 12.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "93 Baxter St, New York, NY", "+1-212-555-0138",
                List.of("Authentic", "Fresh Herbs", "Spicy"));

        addDish(thaiBasil.getId(), "Pad Thai", "Classic stir-fried rice noodles with shrimp",
                "Main Course", "Noodles", 13.99, "Regular",
                List.of("Rice Noodles", "Shrimp", "Eggs", "Bean Sprouts", "Peanuts", "Lime"),
                List.of(), 12, 4.7, 456, false, true, List.of(), null);

        addDish(thaiBasil.getId(), "Green Curry", "Coconut-based green curry with chicken",
                "Main Course", "Curry", 14.99, "Regular",
                List.of("Coconut Milk", "Green Curry Paste", "Chicken", "Thai Basil", "Bamboo Shoots"),
                List.of("Gluten-Free"), 15, 4.6, 345, true, true, List.of(), null);

        addDish(thaiBasil.getId(), "Tom Yum Soup", "Spicy and sour Thai soup with shrimp",
                "Appetizer", "Soup", 8.99, "Bowl",
                List.of("Shrimp", "Lemongrass", "Galangal", "Lime", "Chili"),
                List.of("Gluten-Free"), 10, 4.5, 267, true, false, List.of(), null);

        addDish(thaiBasil.getId(), "Mango Sticky Rice", "Sweet mango with coconut sticky rice",
                "Dessert", "Thai Dessert", 7.99, "Regular",
                List.of("Mango", "Sticky Rice", "Coconut Milk", "Sugar"),
                List.of("Vegan", "Gluten-Free"), 5, 4.8, 345, false, true, List.of(), null);

        addDish(thaiBasil.getId(), "Thai Iced Tea", "Sweet Thai tea with condensed milk",
                "Beverage", "Thai Beverage", 3.99, "Regular",
                List.of("Thai Tea", "Condensed Milk", "Sugar"),
                List.of("Vegetarian", "Gluten-Free"), 3, 4.5, 234, false, false, List.of(), null);

        // Bangkok Street
        Restaurant bangkokStreet = createRestaurant("rest-039", "Bangkok Street",
                "Thai street food favorites in a casual setting",
                List.of("Thai", "Street Food"), 4.2, 450, 1,
                new GeoLocation(40.7440, -73.9920), 25, 10.0, 2.49,
                OperatingHours.lunchAndDinner(),
                "104 E 23rd St, New York, NY", "+1-212-555-0139",
                List.of("Street Food", "Casual", "Quick"));

        addDish(bangkokStreet.getId(), "Pad See Ew", "Wide rice noodles stir-fried with soy sauce",
                "Main Course", "Noodles", 12.99, "Regular",
                List.of("Wide Rice Noodles", "Broccoli", "Egg", "Soy Sauce"),
                List.of(), 10, 4.3, 234, false, false, List.of(), null);

        addDish(bangkokStreet.getId(), "Satay Chicken", "Grilled chicken skewers with peanut sauce",
                "Appetizer", "Thai Appetizer", 8.99, "4 skewers",
                List.of("Chicken", "Peanut Sauce", "Cucumber Relish"),
                List.of("Gluten-Free"), 12, 4.4, 312, false, true, List.of(), null);

        addDish(bangkokStreet.getId(), "Papaya Salad", "Spicy green papaya salad",
                "Appetizer", "Salad", 7.99, "Regular",
                List.of("Green Papaya", "Chili", "Lime", "Fish Sauce", "Peanuts"),
                List.of("Gluten-Free"), 5, 4.2, 198, true, false, List.of(), null);

        // Pad Thai Corner
        Restaurant padThaiCorner = createRestaurant("rest-040", "Pad Thai Corner",
                "Pad Thai specialists with 10 varieties",
                List.of("Thai", "Noodles"), 4.3, 380, 1,
                new GeoLocation(40.7310, -73.9862), 22, 8.0, 2.49,
                OperatingHours.lunchAndDinner(),
                "75 2nd Ave, New York, NY", "+1-212-555-0140",
                List.of("Pad Thai Specialist", "Noodles", "Quick"));

        addDish(padThaiCorner.getId(), "Drunken Noodles", "Spicy flat noodles with Thai basil",
                "Main Course", "Noodles", 13.99, "Regular",
                List.of("Wide Rice Noodles", "Thai Basil", "Chili", "Garlic", "Bell Peppers"),
                List.of(), 12, 4.4, 267, true, true, List.of(), null);

        addDish(padThaiCorner.getId(), "Thai Spring Rolls", "Fresh Vietnamese-style spring rolls",
                "Appetizer", "Thai Appetizer", 6.99, "2 rolls",
                List.of("Rice Paper", "Shrimp", "Vermicelli", "Herbs", "Lettuce"),
                List.of("Gluten-Free"), 5, 4.1, 178, false, false, List.of(), null);

        // Lotus Thai
        Restaurant lotusThai = createRestaurant("rest-041", "Lotus Thai",
                "Elegant Thai dining with a refined menu",
                List.of("Thai", "Seafood"), 4.6, 310, 3,
                new GeoLocation(40.7580, -73.9676), 40, 20.0, 4.99,
                OperatingHours.dinnerOnly(),
                "5 Tudor City Pl, New York, NY", "+1-212-555-0141",
                List.of("Elegant", "Refined", "Premium"));

        addDish(lotusThai.getId(), "Massaman Curry", "Rich peanut curry with potatoes and beef",
                "Main Course", "Curry", 17.99, "Regular",
                List.of("Beef", "Coconut Milk", "Peanuts", "Potatoes", "Massaman Paste"),
                List.of("Gluten-Free"), 20, 4.7, 234, true, true, List.of(), null);

        addDish(lotusThai.getId(), "Crispy Whole Fish", "Deep-fried whole sea bass with chili-lime sauce",
                "Main Course", "Seafood", 28.99, "Whole Fish",
                List.of("Sea Bass", "Chili", "Lime", "Garlic", "Fish Sauce"),
                List.of("Gluten-Free"), 25, 4.8, 178, true, false, List.of(), null);
    }

    // ========== AMERICAN RESTAURANTS (5) ==========

    private void generateAmericanRestaurants() {
        Restaurant grillHouse = createRestaurant("rest-042", "The Grill House",
                "Premium steaks and grills with a craft cocktail bar",
                List.of("American", "Steakhouse"), 4.5, 890, 3,
                new GeoLocation(40.7484, -73.9857), 35, 25.0, 4.99,
                OperatingHours.dinnerOnly(),
                "42 E 49th St, New York, NY", "+1-212-555-0142",
                List.of("Steakhouse", "Premium", "Cocktails"));

        addDish(grillHouse.getId(), "Ribeye Steak", "12oz USDA Prime ribeye with garlic butter",
                "Main Course", "Steak", 38.99, "12oz",
                List.of("Ribeye", "Garlic Butter", "Herbs"),
                List.of("Gluten-Free"), 20, 4.8, 345, false, true, List.of(), null);

        addDish(grillHouse.getId(), "BBQ Ribs", "Slow-smoked baby back ribs with BBQ sauce",
                "Main Course", "BBQ", 24.99, "Half Rack",
                List.of("Pork Ribs", "BBQ Sauce", "Spice Rub"),
                List.of("Gluten-Free"), 25, 4.6, 267, false, true, List.of(), null);

        addDish(grillHouse.getId(), "Caesar Salad", "Classic Caesar salad with croutons and parmesan",
                "Appetizer", "Salad", 10.99, "Regular",
                List.of("Romaine Lettuce", "Caesar Dressing", "Croutons", "Parmesan"),
                List.of("Vegetarian"), 5, 4.3, 198, false, false, List.of(), null);

        addDish(grillHouse.getId(), "Onion Rings", "Beer-battered crispy onion rings",
                "Side", "Appetizer", 7.99, "Regular",
                List.of("Onions", "Beer Batter", "Oil"),
                List.of("Vegetarian"), 8, 4.2, 234, false, false, List.of(), null);

        addDish(grillHouse.getId(), "New York Cheesecake", "Classic creamy New York cheesecake",
                "Dessert", "American Dessert", 8.99, "1 slice",
                List.of("Cream Cheese", "Sugar", "Eggs", "Graham Cracker Crust"),
                List.of("Vegetarian"), 5, 4.7, 312, false, true, List.of(), null);

        // BBQ Nation
        Restaurant bbqNation = createRestaurant("rest-043", "BBQ Nation",
                "Texas-style BBQ with slow-smoked meats",
                List.of("American", "BBQ"), 4.4, 650, 2,
                new GeoLocation(40.7420, -73.9780), 30, 15.0, 3.99,
                OperatingHours.lunchAndDinner(),
                "225 Park Ave S, New York, NY", "+1-212-555-0143",
                List.of("Texas BBQ", "Smoked Meats", "Casual"));

        addDish(bbqNation.getId(), "Brisket Platter", "Slow-smoked beef brisket with two sides",
                "Main Course", "BBQ", 19.99, "Regular",
                List.of("Beef Brisket", "Spice Rub", "BBQ Sauce"),
                List.of("Gluten-Free"), 25, 4.6, 345, false, true, List.of(), null);

        addDish(bbqNation.getId(), "Pulled Pork Sandwich", "Slow-cooked pulled pork on brioche bun",
                "Main Course", "Sandwich", 13.99, "Regular",
                List.of("Pork Shoulder", "BBQ Sauce", "Coleslaw", "Brioche Bun"),
                List.of(), 10, 4.4, 267, false, false, List.of(), null);

        addDish(bbqNation.getId(), "Mac and Cheese", "Creamy baked mac and cheese",
                "Side", "Comfort Food", 6.99, "Regular",
                List.of("Macaroni", "Cheddar Cheese", "Cream", "Breadcrumbs"),
                List.of("Vegetarian"), 10, 4.5, 345, false, true, List.of(), null);

        addDish(bbqNation.getId(), "Cornbread", "Sweet honey cornbread with butter",
                "Side", "Bread", 3.99, "2 pieces",
                List.of("Cornmeal", "Honey", "Butter"),
                List.of("Vegetarian"), 5, 4.2, 198, false, false, List.of(), null);

        // Steak & Fries
        Restaurant steakFries = createRestaurant("rest-044", "Steak & Fries",
                "French-American bistro specializing in steak frites",
                List.of("American", "French", "Steakhouse"), 4.3, 520, 2,
                new GeoLocation(40.7310, -73.9965), 28, 12.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "85 MacDougal St, New York, NY", "+1-212-555-0144",
                List.of("Bistro", "Steak Frites", "French-American"));

        addDish(steakFries.getId(), "Steak Frites", "Hanger steak with truffle fries and herb butter",
                "Main Course", "Steak", 22.99, "Regular",
                List.of("Hanger Steak", "Truffle Fries", "Herb Butter"),
                List.of("Gluten-Free"), 15, 4.5, 278, false, true, List.of(), null);

        addDish(steakFries.getId(), "French Onion Soup", "Classic French onion soup with gruyere",
                "Appetizer", "Soup", 9.99, "Bowl",
                List.of("Onions", "Beef Broth", "Gruyere", "Bread"),
                List.of("Vegetarian"), 12, 4.4, 198, false, false, List.of(), null);

        // American Diner
        Restaurant americanDiner = createRestaurant("rest-045", "Classic American Diner",
                "Retro diner with pancakes, milkshakes, and all-day breakfast",
                List.of("American", "Diner", "Breakfast"), 4.1, 780, 1,
                new GeoLocation(40.7500, -73.9900), 20, 8.0, 1.99,
                OperatingHours.allDay(),
                "160 W 43rd St, New York, NY", "+1-212-555-0145",
                List.of("Retro Diner", "Breakfast", "24/7"));

        addDish(americanDiner.getId(), "Pancake Stack", "Fluffy buttermilk pancakes with maple syrup",
                "Main Course", "Breakfast", 9.99, "3 pancakes",
                List.of("Flour", "Buttermilk", "Eggs", "Butter", "Maple Syrup"),
                List.of("Vegetarian"), 10, 4.3, 345, false, true, List.of(), null);

        addDish(americanDiner.getId(), "Club Sandwich", "Triple-decker club sandwich with fries",
                "Main Course", "Sandwich", 11.99, "Regular",
                List.of("Turkey", "Bacon", "Lettuce", "Tomato", "Mayo", "Toast"),
                List.of(), 10, 4.1, 234, false, false, List.of(), null);

        addDish(americanDiner.getId(), "Apple Pie", "Warm apple pie with vanilla ice cream",
                "Dessert", "American Dessert", 6.99, "1 slice",
                List.of("Apples", "Pie Crust", "Cinnamon", "Sugar", "Vanilla Ice Cream"),
                List.of("Vegetarian"), 5, 4.4, 267, false, false, List.of(), null);

        // Wing House
        Restaurant wingHouse = createRestaurant("rest-046", "Wing House",
                "50+ wing flavors and craft beers",
                List.of("American", "Wings"), 4.0, 920, 1,
                new GeoLocation(40.7557, -73.9710), 22, 10.0, 2.49,
                OperatingHours.lunchAndDinner(),
                "370 3rd Ave, New York, NY", "+1-212-555-0146",
                List.of("Wings", "Craft Beer", "Sports Bar"));

        addDish(wingHouse.getId(), "Buffalo Wings", "Classic buffalo wings with blue cheese",
                "Main Course", "Wings", 12.99, "12 pieces",
                List.of("Chicken Wings", "Buffalo Sauce", "Blue Cheese"),
                List.of("Gluten-Free"), 12, 4.2, 456, true, true, List.of(), null);

        addDish(wingHouse.getId(), "Garlic Parmesan Wings", "Wings tossed in garlic parmesan",
                "Main Course", "Wings", 12.99, "12 pieces",
                List.of("Chicken Wings", "Garlic Butter", "Parmesan"),
                List.of("Gluten-Free"), 12, 4.3, 345, false, false, List.of(), null);

        addDish(wingHouse.getId(), "Mozzarella Sticks", "Crispy mozzarella sticks with marinara",
                "Appetizer", "American Appetizer", 7.99, "6 pieces",
                List.of("Mozzarella", "Breadcrumbs", "Marinara Sauce"),
                List.of("Vegetarian"), 8, 4.0, 267, false, false, List.of(), null);
    }

    // ========== MEDITERRANEAN RESTAURANTS (4) ==========

    private void generateMediterraneanRestaurants() {
        Restaurant greekTaverna = createRestaurant("rest-047", "Greek Taverna",
                "Traditional Greek cuisine with fresh Mediterranean ingredients",
                List.of("Mediterranean", "Greek"), 4.5, 580, 2,
                new GeoLocation(40.7614, -73.9820), 30, 15.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "29 W 50th St, New York, NY", "+1-212-555-0147",
                List.of("Greek", "Fresh Ingredients", "Mediterranean"));

        addDish(greekTaverna.getId(), "Greek Salad", "Fresh salad with feta, olives, and olive oil",
                "Appetizer", "Salad", 9.99, "Regular",
                List.of("Tomatoes", "Cucumber", "Feta", "Olives", "Olive Oil", "Oregano"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.6, 345, false, true, List.of(), null);

        addDish(greekTaverna.getId(), "Gyro Plate", "Lamb gyro with tzatziki and pita bread",
                "Main Course", "Greek", 14.99, "Regular",
                List.of("Lamb", "Pita Bread", "Tzatziki", "Tomato", "Onion"),
                List.of(), 10, 4.5, 267, false, true, List.of(), null);

        addDish(greekTaverna.getId(), "Spanakopita", "Spinach and feta phyllo pastry",
                "Appetizer", "Greek Appetizer", 7.99, "2 pieces",
                List.of("Spinach", "Feta", "Phyllo Dough", "Herbs"),
                List.of("Vegetarian"), 8, 4.3, 198, false, false, List.of(), null);

        addDish(greekTaverna.getId(), "Baklava", "Honey and pistachio phyllo pastry",
                "Dessert", "Greek Dessert", 5.99, "2 pieces",
                List.of("Phyllo Dough", "Pistachios", "Honey", "Butter"),
                List.of("Vegetarian"), 3, 4.7, 289, false, false, List.of(), null);

        // Falafel House
        Restaurant falafelHouse = createRestaurant("rest-048", "Falafel House",
                "Best falafel in town with fresh pita and hummus",
                List.of("Mediterranean", "Middle Eastern"), 4.3, 890, 1,
                new GeoLocation(40.7291, -73.9857), 20, 8.0, 1.99,
                OperatingHours.lunchAndDinner(),
                "13 St Marks Pl, New York, NY", "+1-212-555-0148",
                List.of("Falafel", "Budget", "Vegetarian Friendly"));

        addDish(falafelHouse.getId(), "Falafel Wrap", "Crispy falafel with hummus and tahini in pita",
                "Main Course", "Wrap", 8.99, "Regular",
                List.of("Falafel", "Pita", "Hummus", "Tahini", "Pickled Vegetables"),
                List.of("Vegan"), 8, 4.4, 456, false, true, List.of(), null);

        addDish(falafelHouse.getId(), "Hummus Plate", "Creamy hummus with warm pita bread",
                "Appetizer", "Middle Eastern", 6.99, "Regular",
                List.of("Chickpeas", "Tahini", "Lemon", "Olive Oil", "Pita"),
                List.of("Vegan"), 5, 4.5, 345, false, true, List.of(), null);

        addDish(falafelHouse.getId(), "Shawarma Plate", "Chicken shawarma with garlic sauce and rice",
                "Main Course", "Middle Eastern", 12.99, "Regular",
                List.of("Chicken", "Garlic Sauce", "Rice", "Pickles"),
                List.of("Gluten-Free"), 10, 4.3, 267, false, false, List.of(), null);

        // Olive & Vine
        Restaurant oliveVine = createRestaurant("rest-049", "Olive & Vine",
                "Mediterranean tapas and wine bar",
                List.of("Mediterranean", "Spanish", "Tapas"), 4.6, 420, 3,
                new GeoLocation(40.7336, -74.0027), 35, 18.0, 4.99,
                OperatingHours.dinnerOnly(),
                "113 7th Ave S, New York, NY", "+1-212-555-0149",
                List.of("Tapas", "Wine Bar", "Mediterranean"));

        addDish(oliveVine.getId(), "Grilled Octopus", "Chargrilled octopus with chimichurri",
                "Appetizer", "Tapas", 16.99, "Regular",
                List.of("Octopus", "Chimichurri", "Potatoes"),
                List.of("Gluten-Free"), 15, 4.7, 198, false, true, List.of(), null);

        addDish(oliveVine.getId(), "Lamb Kebabs", "Spiced lamb kebabs with yogurt sauce",
                "Main Course", "Grill", 18.99, "Regular",
                List.of("Lamb", "Yogurt Sauce", "Grilled Vegetables"),
                List.of("Gluten-Free"), 15, 4.5, 178, true, false, List.of(), null);

        addDish(oliveVine.getId(), "Patatas Bravas", "Crispy potatoes with spicy tomato sauce",
                "Appetizer", "Tapas", 7.99, "Regular",
                List.of("Potatoes", "Tomato Sauce", "Aioli"),
                List.of("Vegan", "Gluten-Free"), 10, 4.4, 234, true, false, List.of(), null);

        // Mediterranean Kitchen
        Restaurant medKitchen = createRestaurant("rest-050", "Mediterranean Kitchen",
                "Healthy Mediterranean bowls and salads",
                List.of("Mediterranean", "Healthy"), 4.2, 350, 2,
                new GeoLocation(40.7440, -73.9820), 25, 10.0, 2.99,
                OperatingHours.lunchAndDinner(),
                "135 E 27th St, New York, NY", "+1-212-555-0150",
                List.of("Healthy", "Bowls", "Salads"));

        addDish(medKitchen.getId(), "Mediterranean Bowl", "Quinoa bowl with grilled chicken and veggies",
                "Main Course", "Bowl", 13.99, "Regular",
                List.of("Quinoa", "Chicken", "Roasted Vegetables", "Hummus", "Feta"),
                List.of("Gluten-Free"), 12, 4.3, 267, false, true, List.of(), null);

        addDish(medKitchen.getId(), "Fattoush Salad", "Lebanese bread salad with sumac dressing",
                "Appetizer", "Salad", 8.99, "Regular",
                List.of("Lettuce", "Tomatoes", "Radish", "Pita Chips", "Sumac"),
                List.of("Vegan"), 5, 4.2, 198, false, false, List.of(), null);
    }

    // ========== CONTINENTAL RESTAURANTS (4) ==========

    private void generateContinentalRestaurants() {
        Restaurant theContinental = createRestaurant("rest-051", "The Continental",
                "Upscale continental dining with international flavors",
                List.of("Continental", "Fine Dining"), 4.6, 420, 4,
                new GeoLocation(40.7614, -73.9700), 45, 35.0, 5.99,
                OperatingHours.dinnerOnly(),
                "25 W 56th St, New York, NY", "+1-212-555-0151",
                List.of("Fine Dining", "International", "Premium"));

        addDish(theContinental.getId(), "Grilled Salmon", "Atlantic salmon with lemon dill sauce",
                "Main Course", "Seafood", 28.99, "Regular",
                List.of("Atlantic Salmon", "Lemon", "Dill", "Asparagus"),
                List.of("Gluten-Free"), 20, 4.7, 267, false, true, List.of(), null);

        addDish(theContinental.getId(), "Mushroom Risotto", "Truffle mushroom risotto with parmesan",
                "Main Course", "Risotto", 22.99, "Regular",
                List.of("Arborio Rice", "Mushrooms", "Truffle Oil", "Parmesan"),
                List.of("Vegetarian", "Gluten-Free"), 20, 4.6, 198, false, false, List.of(), null);

        addDish(theContinental.getId(), "Creme Brulee", "Classic vanilla creme brulee",
                "Dessert", "French Dessert", 10.99, "1 serving",
                List.of("Cream", "Eggs", "Sugar", "Vanilla"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.8, 234, false, true, List.of(), null);

        // Bistro 21
        Restaurant bistro21 = createRestaurant("rest-052", "Bistro 21",
                "French bistro with seasonal menu and natural wines",
                List.of("Continental", "French"), 4.4, 380, 3,
                new GeoLocation(40.7336, -74.0000), 35, 20.0, 4.49,
                OperatingHours.dinnerOnly(),
                "21 Bedford St, New York, NY", "+1-212-555-0152",
                List.of("French Bistro", "Seasonal", "Natural Wines"));

        addDish(bistro21.getId(), "Duck Confit", "Slow-cooked duck leg with lentils",
                "Main Course", "French", 26.99, "Regular",
                List.of("Duck Leg", "Duck Fat", "Lentils", "Thyme"),
                List.of("Gluten-Free"), 25, 4.6, 198, false, true, List.of(), null);

        addDish(bistro21.getId(), "Escargot", "Garlic butter snails in mushroom caps",
                "Appetizer", "French Appetizer", 13.99, "6 pieces",
                List.of("Snails", "Garlic Butter", "Parsley", "Mushroom Caps"),
                List.of("Gluten-Free"), 10, 4.4, 156, false, false, List.of(), null);

        addDish(bistro21.getId(), "Chocolate Mousse", "Rich dark chocolate mousse",
                "Dessert", "French Dessert", 9.99, "1 serving",
                List.of("Dark Chocolate", "Cream", "Eggs", "Sugar"),
                List.of("Vegetarian", "Gluten-Free"), 5, 4.5, 189, false, false, List.of(), null);

        // Fine Dine
        Restaurant fineDine = createRestaurant("rest-053", "Fine Dine",
                "Contemporary European cuisine with tasting menus",
                List.of("Continental", "European"), 4.7, 280, 4,
                new GeoLocation(40.7614, -73.9660), 50, 50.0, 0.0,
                OperatingHours.dinnerOnly(),
                "55 E 54th St, New York, NY", "+1-212-555-0153",
                List.of("Tasting Menu", "Michelin Recommended", "Premium"));

        addDish(fineDine.getId(), "Tasting Menu", "7-course seasonal tasting menu",
                "Main Course", "Tasting Menu", 120.00, "7 courses",
                List.of("Seasonal Ingredients", "Chef's Selection"),
                List.of("Gluten-Free"), 90, 4.9, 156, false, true, List.of(), null);

        addDish(fineDine.getId(), "Foie Gras", "Seared foie gras with fig compote",
                "Appetizer", "French Appetizer", 28.99, "Regular",
                List.of("Foie Gras", "Fig Compote", "Brioche"),
                List.of(), 10, 4.7, 134, false, false, List.of(), null);

        // The Brasserie
        Restaurant brasserie = createRestaurant("rest-054", "The Brasserie",
                "Classic brasserie fare in a Parisian-inspired setting",
                List.of("Continental", "French", "Brasserie"), 4.3, 460, 2,
                new GeoLocation(40.7520, -73.9780), 30, 15.0, 3.49,
                OperatingHours.lunchAndDinner(),
                "460 Park Ave, New York, NY", "+1-212-555-0154",
                List.of("Brasserie", "Parisian", "Classic"));

        addDish(brasserie.getId(), "Steak Tartare", "Hand-cut beef tartare with capers and egg yolk",
                "Appetizer", "French Appetizer", 16.99, "Regular",
                List.of("Beef", "Capers", "Egg Yolk", "Dijon", "Shallots"),
                List.of("Gluten-Free"), 5, 4.5, 178, false, false, List.of(), null);

        addDish(brasserie.getId(), "Coq au Vin", "Braised chicken in red wine with mushrooms",
                "Main Course", "French", 21.99, "Regular",
                List.of("Chicken", "Red Wine", "Mushrooms", "Pearl Onions", "Bacon"),
                List.of("Gluten-Free"), 25, 4.4, 198, false, true, List.of(), null);

        addDish(brasserie.getId(), "Profiteroles", "Cream puffs with chocolate sauce",
                "Dessert", "French Dessert", 8.99, "3 pieces",
                List.of("Choux Pastry", "Pastry Cream", "Chocolate Sauce"),
                List.of("Vegetarian"), 5, 4.3, 167, false, false, List.of(), null);

        addDish(brasserie.getId(), "Fresh Lime Soda", "Refreshing lime soda drink",
                "Beverage", "Soft Drink", 3.49, "Regular",
                List.of("Lime", "Sugar", "Soda Water"),
                List.of("Vegan", "Gluten-Free"), 2, 4.0, 234, false, false, List.of(), null);
    }

    // ========== HELPER METHODS ==========

    private Restaurant createRestaurant(String id, String name, String description,
                                        List<String> cuisine, double rating, int reviewCount, int priceRange,
                                        GeoLocation location, int deliveryTime, double minimumOrder,
                                        double deliveryFee, OperatingHours operatingHours,
                                        String address, String phone, List<String> features) {
        Restaurant restaurant = Restaurant.builder()
                .id(id)
                .name(name)
                .description(description)
                .cuisine(cuisine)
                .rating(rating)
                .reviewCount(reviewCount)
                .priceRange(priceRange)
                .location(location)
                .deliveryTime(deliveryTime)
                .minimumOrder(minimumOrder)
                .deliveryFee(deliveryFee)
                .operatingHours(operatingHours)
                .available(true)
                .address(address)
                .phone(phone)
                .features(features)
                .provider("MOCK")
                .tags(cuisine)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        restaurants.add(restaurant);
        return restaurant;
    }

    private void addDish(String restaurantId, String name, String description,
                         String category, String subcategory, double price, String portionSize,
                         List<String> ingredients, List<String> dietaryTags,
                         int preparationTime, double rating, int reviewCount,
                         boolean spicy, boolean bestSeller,
                         List<Customization> customizations, NutritionalInfo nutritionalInfo) {
        dishCounter++;
        Dish dish = Dish.builder()
                .id(String.format("dish-%03d", dishCounter))
                .restaurantId(restaurantId)
                .name(name)
                .description(description)
                .category(category)
                .subcategory(subcategory)
                .price(price)
                .portionSize(portionSize)
                .ingredients(ingredients)
                .dietaryTags(dietaryTags)
                .customizations(customizations != null ? customizations : List.of())
                .nutritionalInfo(nutritionalInfo)
                .preparationTime(preparationTime)
                .available(true)
                .rating(rating)
                .reviewCount(reviewCount)
                .spicy(spicy)
                .bestSeller(bestSeller)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        dishes.add(dish);
    }
}

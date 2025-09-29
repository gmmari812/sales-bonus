/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
   const discountMultiplier = 1 - (discount / 100);
   return sale_price * quantity * discountMultiplier;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    }
    else if (index === 1 || index === 2) {
        return profit * 0.1;
    }
    else if (index === total - 1) {
        return 0;
    }
    else {
        return profit * 0.05
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
     const { calculateRevenue, calculateBonus } = options;
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
            throw new Error("Некорректные входные данные");
        }

    // Проверка наличия опций
        if (
            !options ||
            typeof options.calculateRevenue !== "function" || 
            typeof options.calculateBonus !== "function"
        ) {
            throw new Error("Не переданы функции расчета");
        }

    // Подготовка промежуточных данных
        const sellerStats = data.sellers.map((seller) => ({
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        }))

    // Индексация продавцов и товаров
        const sellerIndex = Object.fromEntries(
            sellerStats.map(item => [item.id, item]));
        const productIndex = Object.fromEntries(
            data.products.map(item => [item.sku, item]));
    
    // Расчет выручки и прибыли для каждого продавца
        data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    if (seller) {
      seller.sales_count++;
      seller.revenue += record.total_amount;
    }

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар

      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;

      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateRevenue(item, product);

      sellerStats.map((val) => {
        if (val.id === seller.id) {
          val.profit += revenue - cost;

          if (!val.products_sold[item.sku]) {
            val.products_sold[item.sku] = 0;
          }

          val.products_sold[item.sku] += item.quantity;
        }
      });
    });
  });

    // Сортировка продавцов по прибыли
        sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
        sellerStats.forEach((seller, index) => {
            seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
            seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({sku, quantity}))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        })

    // Подготовка итоговой коллекции с нужными полями
      return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
      }))
}
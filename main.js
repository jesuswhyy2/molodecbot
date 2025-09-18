const TELEGRAM_TOKEN = "7446620***"; 
const SHEET_NAME     = "Карма";     
const MOLODEC_MESSAGES_SHEET = "МолодецСообщения"; 
const MLD_SHEET_NAME = "MLD_Economy"; 
const MLD_TRANSACTIONS_SHEET = "MLD_Transactions"; 
const MLD_SHOP_SHEET = "MLD_Shop"; 
const ADMIN_CHAT_ID = -1002***; 
const PROPERTIES_KEY = "TODAY_MULTIPLIER";


const MLD_CONFIG = {
  MAX_SUPPLY: 10000,           
  BASE_PRICE: 100,             
  MIN_PRICE: 50,               
  MAX_PRICE: 1000,             
  MINING_REWARDS: {
    DAILY_TOP_1: 0.5,         
    DAILY_TOP_2: 0.3,         
    DAILY_TOP_3: 0.1,         
    DAILY_GIVEN_TOP_1: 0.3,   
    DAILY_GIVEN_TOP_2: 0.2,   
    DAILY_GIVEN_TOP_3: 0.1,   
    STREAK_7: 0.2,            
    STREAK_14: 0.5,           
    STREAK_30: 1.0,           
    VOTING_WIN: 0.1           
  },
  BURN_RATE: 0.1,             
  HALVING_INTERVAL: 2000,     
  LIQUIDITY_PERCENT: 0.05     
};


const VOTING_DURATION_MINUTES = 15; 
const VOTING_REWARDS = {
  MIN_REWARD: 10,          
  MAX_REWARD: 30,          
  BONUS_THRESHOLD_HIGH: 0.8, 
  BONUS_THRESHOLD_MID: 0.7,  
  HIGH_BONUS: 8,           
  MID_BONUS: 4             
};


const STREAK_BONUSES = {
  3: { bonus: 3, message: "🔥 набирает обороты! 3 дня активности подряд" },
  7: { bonus: 10, message: "⚡ целую неделю активен!" },
  14: { bonus: 25, message: "🌟 держит планку активности 2 недели!" },
  21: { bonus: 50, message: "💎 три недели безупречной активности!" },
  30: { bonus: 100, message: "🚀 МЕСЯЧНЫЙ МАРАФОН АКТИВНОСТИ! Невероятное достижение!" },
  60: { bonus: 200, message: "💎 два месяца активности подряд! Легенда!" },
  90: { bonus: 500, message: "🚀 КВАРТАЛЬНЫЙ ТИТАН АКТИВНОСТИ! Невероятно!" },
  180: { bonus: 1000, message: "👑 ПОЛУГОДОВОЙ ИМПЕРАТОР АКТИВНОСТИ!" },
  365: { bonus: 2000, message: "🌟 ГОДОВОЙ ПОВЕЛИТЕЛЬ ВСЕЛЕННОЙ МОЛОДЦОВОЙ АКТИВНОСТИ!" }
};




function initializeMldSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  
  let mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
  if (!mldSheet) {
    mldSheet = spreadsheet.insertSheet(MLD_SHEET_NAME);
    mldSheet.getRange(1, 1, 1, 6).setValues([[
      "USER_ID", "USERNAME", "MLD_BALANCE", "TOTAL_MINED", "TOTAL_BOUGHT", "TOTAL_SOLD"
    ]]);
    mldSheet.getRange(1, 1, 1, 6).setFontWeight("bold");
  }
  
  
  let transactionsSheet = spreadsheet.getSheetByName(MLD_TRANSACTIONS_SHEET);
  if (!transactionsSheet) {
    transactionsSheet = spreadsheet.insertSheet(MLD_TRANSACTIONS_SHEET);
    transactionsSheet.getRange(1, 1, 1, 8).setValues([[
      "TIMESTAMP", "USER_ID", "USERNAME", "TYPE", "MLD_AMOUNT", "MOLODEC_AMOUNT", "PRICE", "BALANCE_AFTER"
    ]]);
    transactionsSheet.getRange(1, 1, 1, 8).setFontWeight("bold");
  }
  
  
  let shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
  if (!shopSheet) {
    shopSheet = spreadsheet.insertSheet(MLD_SHOP_SHEET);
    shopSheet.getRange(1, 1, 1, 6).setValues([[
      "ITEM_ID", "ITEM_NAME", "DESCRIPTION", "PRICE_MLD", "AVAILABLE", "CATEGORY"
    ]]);
    shopSheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    
    
    const initialItems = [
      ["roulette_boost", "Удвоение рулетки", "Удваивает выигрыш в следующей игре рулетки", 0.1, 999, "premium"],
      ["priority_random", "Приоритет в розыгрышах", "Увеличивает шанс выигрыша в /random на 24 часа", 0.3, 999, "premium"],
      ["mug_branded", "Фирменная кружка", "Кружка с логотипом компании", 5.0, 50, "merch"],
      ["hoodie_branded", "Толстовка с логотипом", "Эксклюзивная толстовка", 15.0, 20, "merch"],
      ["stickers_exclusive", "Эксклюзивные стикеры", "Набор уникальных стикеров", 1.0, 100, "merch"]
    ];
    
    shopSheet.getRange(2, 1, initialItems.length, 6).setValues(initialItems);
  }
  
  
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("MLD_TOTAL_SUPPLY")) {
    properties.setProperties({
      "MLD_TOTAL_SUPPLY": "0",
      "MLD_DAILY_VOLUME": "0",
      "MLD_LAST_PRICE": MLD_CONFIG.BASE_PRICE.toString(),
      "MLD_MARKET_DATA": JSON.stringify({
        totalBuyOrders: 0,
        totalSellOrders: 0,
        lastUpdate: new Date().getTime()
      })
    });
  }
}


function getMldPrice() {
  const properties = PropertiesService.getScriptProperties();
  const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
  const dailyVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
  const lastPrice = parseFloat(properties.getProperty("MLD_LAST_PRICE") || MLD_CONFIG.BASE_PRICE.toString());
  
  
  const scarcityMultiplier = 1 + (totalSupply / MLD_CONFIG.MAX_SUPPLY) * 2; 
  
  
  const demandFactor = Math.min(0.5, dailyVolume / 100); 
  
  
  let newPrice = MLD_CONFIG.BASE_PRICE * scarcityMultiplier * (1 + demandFactor);
  
  
  newPrice = Math.max(MLD_CONFIG.MIN_PRICE, Math.min(MLD_CONFIG.MAX_PRICE, newPrice));
  
  
  const maxChange = lastPrice * 0.1;
  if (Math.abs(newPrice - lastPrice) > maxChange) {
    newPrice = lastPrice + (newPrice > lastPrice ? maxChange : -maxChange);
  }
  
  
  properties.setProperty("MLD_LAST_PRICE", newPrice.toString());
  
  return Math.round(newPrice * 100) / 100; 
}


function getUserMldBalance(userId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
  
  if (!mldSheet) {
    initializeMldSheets();
    return 0;
  }
  
  const data = mldSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      return parseFloat(data[i][2]) || 0;
    }
  }
  
  return 0;
}


function updateUserMldBalance(userId, username, mldDelta, transactionType = "unknown", molodecAmount = 0) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
  
  if (!mldSheet) {
    initializeMldSheets();
    mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
  }
  
  const data = mldSheet.getDataRange().getValues();
  let userFound = false;
  let newBalance = 0;
  
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const currentBalance = parseFloat(data[i][2]) || 0;
      newBalance = Math.max(0, currentBalance + mldDelta); 
      
      mldSheet.getRange(i + 1, 3).setValue(newBalance);
      
      
      if (transactionType === "mining") {
        const totalMined = (parseFloat(data[i][3]) || 0) + Math.max(0, mldDelta);
        mldSheet.getRange(i + 1, 4).setValue(totalMined);
      } else if (transactionType === "buy") {
        const totalBought = (parseFloat(data[i][4]) || 0) + Math.max(0, mldDelta);
        mldSheet.getRange(i + 1, 5).setValue(totalBought);
      } else if (transactionType === "sell") {
        const totalSold = (parseFloat(data[i][5]) || 0) + Math.abs(mldDelta);
        mldSheet.getRange(i + 1, 6).setValue(totalSold);
      }
      
      userFound = true;
      break;
    }
  }
  
  
  if (!userFound) {
    newBalance = Math.max(0, mldDelta);
    const newRow = [userId, username, newBalance, 0, 0, 0];
    
    if (transactionType === "mining") newRow[3] = Math.max(0, mldDelta);
    else if (transactionType === "buy") newRow[4] = Math.max(0, mldDelta);
    else if (transactionType === "sell") newRow[5] = Math.abs(mldDelta);
    
    mldSheet.appendRow(newRow);
  }
  
  
  recordMldTransaction(userId, username, transactionType, mldDelta, molodecAmount, newBalance);
  
  return newBalance;
}


function recordMldTransaction(userId, username, type, mldAmount, molodecAmount, balanceAfter) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let transactionsSheet = spreadsheet.getSheetByName(MLD_TRANSACTIONS_SHEET);
  
  if (!transactionsSheet) {
    initializeMldSheets();
    transactionsSheet = spreadsheet.getSheetByName(MLD_TRANSACTIONS_SHEET);
  }
  
  const currentPrice = getMldPrice();
  const timestamp = new Date();
  
  transactionsSheet.appendRow([
    timestamp,
    userId,
    username,
    type,
    mldAmount,
    molodecAmount,
    currentPrice,
    balanceAfter
  ]);
  
  
  if (type === "buy" || type === "sell") {
    updateDailyVolume(Math.abs(mldAmount));
  }
}


function updateDailyVolume(mldAmount) {
  const properties = PropertiesService.getScriptProperties();
  const currentVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
  properties.setProperty("MLD_DAILY_VOLUME", (currentVolume + mldAmount).toString());
}


function miningMldReward(userId, username, rewardType, notify) {
  
  if (typeof notify === 'undefined') notify = true;
  const rewards = MLD_CONFIG.MINING_REWARDS;
  let mldReward = 0;
  
  switch (rewardType) {
    case "daily_top_1": mldReward = rewards.DAILY_TOP_1; break;
    case "daily_top_2": mldReward = rewards.DAILY_TOP_2; break;
    case "daily_top_3": mldReward = rewards.DAILY_TOP_3; break;
    case "daily_given_top_1": mldReward = rewards.DAILY_GIVEN_TOP_1; break;
    case "daily_given_top_2": mldReward = rewards.DAILY_GIVEN_TOP_2; break;
    case "daily_given_top_3": mldReward = rewards.DAILY_GIVEN_TOP_3; break;
    case "streak_7": mldReward = rewards.STREAK_7; break;
    case "streak_14": mldReward = rewards.STREAK_14; break;
    case "streak_30": mldReward = rewards.STREAK_30; break;
    case "voting_win": mldReward = rewards.VOTING_WIN; break;
    default: return;
  }
  
  
  const properties = PropertiesService.getScriptProperties();
  const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
  const halvingLevel = Math.floor(totalSupply / MLD_CONFIG.HALVING_INTERVAL);
  mldReward = mldReward / Math.pow(2, halvingLevel); 
  
  
  mldReward = Math.round(mldReward * 10000) / 10000;
  
  if (mldReward > 0 && totalSupply + mldReward <= MLD_CONFIG.MAX_SUPPLY) {
    
    properties.setProperty("MLD_TOTAL_SUPPLY", (totalSupply + mldReward).toString());
    
    
    updateUserMldBalance(userId, username, mldReward, "mining");
    
    
    const line = `@${username} получает ${mldReward} MLD за ${getRewardDescription(rewardType)}`;
    if (notify) {
      
      const message = `⛏️ Майнинг MLD! ${line}`;
      sendMessage(ADMIN_CHAT_ID, message);
    } else {
      
      return { mldReward, message: `• ${line}` };
    }
    
    Logger.log(`Майнинг MLD: ${username} получил ${mldReward} MLD за ${rewardType}`);
    
    return { mldReward, message: `• ${line}` };
  }
  return null;
}


function getRewardDescription(rewardType) {
  const descriptions = {
    "daily_top_1": "1 место в ежедневном топе",
    "daily_top_2": "2 место в ежедневном топе", 
    "daily_top_3": "3 место в ежедневном топе",
    "daily_given_top_1": "1 место в топе по выданным за день",
    "daily_given_top_2": "2 место в топе по выданным за день",
    "daily_given_top_3": "3 место в топе по выданным за день",
    "streak_7": "серию активности 7 дней",
    "streak_14": "серию активности 14 дней",
    "streak_30": "серию активности 30 дней",
    "voting_win": "выигрыш в голосовании"
  };
  return descriptions[rewardType] || rewardType;
}


function purchaseMldItem(userId, username, itemId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
  
  if (!shopSheet) {
    return { success: false, message: "❌ Магазин не инициализирован" };
  }
  
  const shopData = shopSheet.getDataRange().getValues();
  let itemRow = -1;
  let itemData = null;
  
  
  for (let i = 1; i < shopData.length; i++) {
    if (shopData[i][0].toLowerCase() === itemId.toLowerCase()) {
      itemRow = i;
      itemData = shopData[i];
      break;
    }
  }
  
  if (!itemData) {
    return { success: false, message: "❌ Товар не найден" };
  }
  
  const itemName = itemData[1];
  const itemPrice = parseFloat(itemData[3]);
  const available = parseInt(itemData[4]) || 0;
  
  if (available <= 0) {
    return { success: false, message: `❌ Товар "${itemName}" закончился` };
  }
  
  const userMldBalance = getUserMldBalance(userId);
  if (userMldBalance < itemPrice) {
    return { success: false, message: `❌ Недостаточно MLD! Нужно: ${itemPrice}, у вас: ${userMldBalance}` };
  }
  
  
  updateUserMldBalance(userId, username, -itemPrice, "purchase", 0);
  
  
  shopSheet.getRange(itemRow + 1, 5).setValue(available - 1);
  
  
  const burnAmount = itemPrice * MLD_CONFIG.BURN_RATE;
  const properties = PropertiesService.getScriptProperties();
  const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
  properties.setProperty("MLD_TOTAL_SUPPLY", Math.max(0, totalSupply - burnAmount).toString());
  
  
  const effectResult = applyItemEffect(userId, username, itemId, itemData);
  
  let message = `✅ Покупка завершена!\n🛒 Товар: ${itemName}\n💎 Потрачено: ${itemPrice} MLD`;
  
  if (burnAmount > 0) {
    message += `\n🔥 Сожжено: ${burnAmount.toFixed(4)} MLD`;
  }
  
  if (effectResult) {
    message += `\n${effectResult}`;
  }
  
  
  recordMldPurchase(userId, username, itemId, itemName, itemPrice);
  
  return { success: true, message };
}


function applyItemEffect(userId, username, itemId, itemData) {
  const properties = PropertiesService.getScriptProperties();
  
  switch (itemId) {
    case "roulette_boost":
      properties.setProperty(`roulette_boost_${userId}`, "1");
      return "🎰 Следующий выигрыш в рулетке будет удвоен!";
      
    case "priority_random":
      const priorityEnd = new Date();
      priorityEnd.setHours(priorityEnd.getHours() + 24);
      properties.setProperty(`priority_random_${userId}`, priorityEnd.getTime().toString());
      return "🎯 Приоритет в случайных розыгрышах активен на 24 часа!";
      
    case "power_bank":
    case "thermo_cap":  
    case "tshot_polo":  
    case "apple_watch":  
    case "air_pods":  
    case "smart_speaker":
    case "spa_cert":
      
      sendMessage(ADMIN_CHAT_ID, `📦 Заказ товара: @${username} купил(а) "${itemData[1]}" за ${itemData[3]} MLD`);
      return "📦 Заказ отправлен! Администрация свяжется с вами для доставки.";
      
    default:
      return "✨ Товар активирован!";
  }
}


function recordMldPurchase(userId, username, itemId, itemName, price) {
  
  recordMldTransaction(userId, username, "purchase", -price, 0, getUserMldBalance(userId));
}


function checkUserEffects(userId) {
  const properties = PropertiesService.getScriptProperties();
  const now = new Date().getTime();
  
  const effects = {
    rouletteBoost: false,
    priorityRandom: false
  };
  
  
  if (properties.getProperty(`roulette_boost_${userId}`)) {
    effects.rouletteBoost = true;
  }
  
  
  const priorityEnd = properties.getProperty(`priority_random_${userId}`);
  if (priorityEnd && parseInt(priorityEnd) > now) {
    effects.priorityRandom = true;
  }
  
  return effects;
}


function checkKarmaMultiplier() {
  const probability = Math.random();
  let multiplier = 1;
  let message = "";
  
  if (probability < 0.05) { 
    multiplier = 3;
    message = "💥 Сегодня ДЕНЬ ТРОЙНЫХ МОЛОДЦОВ! Все получаемые молодцы ×3";
  } else if (probability < 0.15) { 
    multiplier = 2;
    message = "🔥 Сегодня ДЕНЬ ДВОЙНЫХ МОЛОДЦОВ! Все получаемые молодцы ×2";
  }
  
  
  if (multiplier > 1) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    PropertiesService.getScriptProperties().setProperty(
      PROPERTIES_KEY,
      JSON.stringify({
        multiplier: multiplier,
        date: today
      })
    );
    sendMessage(ADMIN_CHAT_ID, message);
  } else {
    PropertiesService.getScriptProperties().deleteProperty(PROPERTIES_KEY);
  }
}

function checkKarmaMultiplierManual() {
  const probability = Math.random();
  let multiplier = 1;
  let message = "";
  
  if (probability < 0.99) { 
    multiplier = 6;
    message = "💥💥💥 Сегодня ДЕНЬ ШЕСТЕРНЫХ МОЛОДЦОВ в честь праздника! Все получаемые молодцы ×6";
  } 
  
  if (multiplier > 1) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    PropertiesService.getScriptProperties().setProperty(
      PROPERTIES_KEY,
      JSON.stringify({
        multiplier: multiplier,
        date: today
      })
    );
    sendMessage(ADMIN_CHAT_ID, message);
  } else {
    PropertiesService.getScriptProperties().deleteProperty(PROPERTIES_KEY);
  }
}

function getKarmaMultiplier() {
  const props = PropertiesService.getScriptProperties().getProperty(PROPERTIES_KEY);
  if (!props) {
    Logger.log("Мультипликатор: 1 (нет данных в PropertiesService)");
    return 1;
  }
  
  try {
    const data = JSON.parse(props);
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    
    if (!data.hasOwnProperty('multiplier') || !data.hasOwnProperty('date')) {
      Logger.log(`Мультипликатор: 1 (неверный формат данных: ${props})`);
      return 1;
    }
    
    const multiplier = (data.date === today) ? data.multiplier : 1;
    
    Logger.log(`Мультипликатор: ${multiplier} (дата: ${data.date}, сегодня: ${today})`);
    
    return multiplier;
  } catch (e) {
    Logger.log(`Мультипликатор: 1 (ошибка парсинга JSON: ${e.message}, данные: ${props})`);
    return 1;
  }
}

function getRank(points) {
  if (points >= 2000) return "🚀 Межвселенский молодец";
  if (points >= 1500) return "🪐 Легендарный молодец";
  if (points >= 1000) return "🌌 Вселенский молодец";
  if (points >= 750)  return "🌟 Сверхсветовой молодец";
  if (points >= 500)  return "🌠 Галактический молодец";
  if (points >= 300)  return "⚡ Супермолодец";
  if (points >= 200)  return "🔥 Уверенный молодец";
  if (points >= 100)  return "🏅 Заслуженный молодец";
  if (points >= 75)   return "🥇 Добрый молодец";
  if (points >= 50)   return "🎖 Опытный молодец";
  if (points >= 30)   return "🌟 Молодец";
  if (points >= 20)   return "🌱 Растущий молодец";
  if (points >= 10)   return "✨ Начинающий молодец";
  return "🐣 Птенец-молодец";
}



function setWebhook() {
  const scriptUrl = "https://script.google.com/macros/s/AKfycbw_b5XKS2uNsHt-IshWfc3v1x7hQ16afED9HzD6vyJKNJNNrp6yCog56Q6laoQl-CXPww/exec"; 
  const resp = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${encodeURIComponent(scriptUrl)}`, { method: "post" });
  Logger.log("Webhook установлен: " + resp.getContentText());
}


function deleteWebhook() {
  const resp = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook`, { method: "post" });
  Logger.log("Webhook удален: " + resp.getContentText());
}


function getWebhookInfo() {
  const resp = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`);
  Logger.log("getWebhookInfo: " + resp.getContentText());
}


function doGet(e) {
  return ContentService
    .createTextOutput("Bot is running")
    .setMimeType(ContentService.MimeType.TEXT);
}


function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  
  if (payload.callback_query) {
    handleCallbackQuery(payload.callback_query);
  } else if (payload.message) {
    handleMessage(payload.message);
  }
}

function handleMessage(msg) {
  const chatId   = msg.chat && msg.chat.id;
  const text     = (msg.text || "").trim();
  const entities = msg.entities || [];
  if (!chatId || !text) return;

  
  if (entities.length > 0 && entities[0].type === "bot_command") {
    if (text.startsWith("/start")) {
      sendMessage(chatId, "Привет! Я бот для подсчёта молодцов. Ответьте /molodec на сообщение, чтобы начислить очки.");
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
    
    if (text.startsWith("/me")) {
      const userId = msg.from.id;
      const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data   = sheet.getDataRange().getValues();
      let row;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(userId)) { row = data[i]; break; }
      }
      if (!row) {
        sendMessage(chatId, "Вы ещё не получили ни одного молодца и ни разу не наградили.");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      const received = parseInt(row[2], 10) || 0;
      const given    = parseInt(row[3], 10) || 0;
      const rank     = getRank(received);
      const streak   = getUserStreak(userId);
      
      let textReply = `Ваш счет:\nПолучено: ${received} (${rank})\nВыдано: ${given}`;
      if (streak > 0) {
        textReply += `\n🔥 Серия активности: ${streak} дней`;
      }
      
      sendMessage(chatId, textReply);
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
if (text.startsWith("/molodec") || text.startsWith("/bigmolodec")) {
  const isBig = text.startsWith("/bigmolodec");
  if (!msg.reply_to_message || !msg.reply_to_message.from) {
    sendMessage(chatId, `Команда ${isBig ? '/bigmolodec' : '/molodec'} должна быть ответом на сообщение!`);
    deleteMessage(chatId, msg.message_id);
    return;
  }
  const target = msg.reply_to_message.from;
  
  if (String(target.id) === "667861609") {
    sendMessage(chatId, "❌ Начисление молодцов этому пользователю запрещено.");
    deleteMessage(chatId, msg.message_id);
    return;
  }
  if (msg.from.id === target.id) {
    sendMessage(chatId, `❌ Нельзя начислять ${isBig ? 'большого ' : ''}молодца самому себе!`);
    deleteMessage(chatId, msg.message_id);
    return;
  }
  const delta = isBig ? 10 : 3;
  
  
  const lastAwardKey = `LAST_AWARD_${msg.from.id}_${target.id}`;
  const scriptProps = PropertiesService.getScriptProperties();
  const lastAwardTime = scriptProps.getProperty(lastAwardKey);
  const now = new Date().getTime();
  if (lastAwardTime && (now - parseInt(lastAwardTime, 10) < 60000)) {
    sendMessage(chatId, "❌ Сработал антиспам");
    deleteMessage(chatId, msg.message_id);
    return;
  }
  scriptProps.setProperty(lastAwardKey, now.toString());
  
  
  saveMolodecMessage({
    senderId: msg.from.id,
    senderName: msg.from.username || msg.from.first_name,
    recipientId: target.id,
    recipientName: target.username || target.first_name,
    messageText: msg.reply_to_message.text || "Медиафайл",
    messageDate: new Date(),
    molodecType: isBig ? "bigmolodec" : "molodec",
    points: delta
  });
  
  updateReceivedPoints(target.id, target.username || target.first_name, delta); 
  updateGivenCount(chatId, msg.from.id, msg.from.username || msg.from.first_name, 1); 
  deleteMessage(chatId, msg.message_id);
  return;
}

    
    if (text.startsWith("/score")) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data  = sheet.getDataRange().getValues().slice(1);
      if (data.length === 0) {
        sendMessage(chatId, "Пока нет зарегистрированных пользователей.");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const topReceived = data
        .map(r => ({ username: r[1], received: parseInt(r[2],10)||0 }))
        .sort((a,b) => b.received - a.received)
        .slice(0,5);
      
      const topGiven = data
        .map(r => ({ username: r[1], given: parseInt(r[3],10)||0 }))
        .sort((a,b) => b.given - a.given)
        .slice(0,5);

      let msgText = "🏆 Рейтинг по молодцам:\n\n";
      msgText += "Получено:\n";
      topReceived.forEach((u,i) => {
        msgText += `${i+1}. <b>${u.username}</b> — ${u.received} (${getRank(u.received)})\n`;
      });
      msgText += "\nВыдано:\n";
      topGiven.forEach((u,i) => {
        msgText += `${i+1}. <b>${u.username}</b> — ${u.given}\n`;
      });
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
    if (text.startsWith("/streaks")) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data = sheet.getDataRange().getValues().slice(1);
      
      if (data.length === 0) {
        sendMessage(chatId, "Пока нет зарегистрированных пользователей.");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const streaksData = data
        .map(row => ({
          username: row[1],
          streak: getUserStreak(row[0])
        }))
        .filter(u => u.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 10);
      
      if (streaksData.length === 0) {
        sendMessage(chatId, "Пока нет активных серий.");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      let msgText = "🔥 Топ серий активности:\n\n";
      streaksData.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        msgText += `${medal} ${i+1}. <b>${u.username}</b> — ${u.streak} дней\n`;
      });
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
    if (text.startsWith("/roulette")) {
      const args = text.split(" ");
      if (args.length < 2) {
        sendMessage(chatId, "❌ Укажите количество молодцов для ставки!\nПример: /roulette 5");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const bet = parseInt(args[1], 10);
      if (!bet || bet < 1) {
        sendMessage(chatId, "❌ Ставка должна быть положительным числом!");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let userPoints = 0;
      let userRowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
          userPoints = parseInt(data[i][2], 10) || 0;
          userRowIndex = i;
          break;
        }
      }
      
      if (userPoints < bet) {
        sendMessage(chatId, `❌ У вас недостаточно молодцов! Текущий баланс: ${userPoints}`);
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      
      const loadingMsg = sendMessage(chatId, "🎰 Крутим рулетку...");
      const messageId = loadingMsg.result.message_id;
      
      const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎"];
      
      for (let i = 0; i < 8; i++) {
        const randomSymbols = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        editMessageText(chatId, messageId, `🎰 ${randomSymbols.join(" | ")} 🎰`);
        Utilities.sleep(300);
      }
      
      
      const isWin = Math.random() < 0.5;
      
      if (isWin) {
        let winAmount = bet * 2;
        
        
        const userEffects = checkUserEffects(userId);
        if (userEffects.rouletteBoost) {
          winAmount *= 2; 
          PropertiesService.getScriptProperties().deleteProperty(`roulette_boost_${userId}`);
          editMessageText(chatId, messageId, `🎰 💎 | 💎 | 💎 🎰\n🚀 @${username} выиграл(а) ${winAmount} молодцов с MLD БУСТОМ!`);
        } else {
          editMessageText(chatId, messageId, `🎰 💎 | 💎 | 💎 🎰\n🎉 @${username} выиграл(а) ${winAmount} молодцов!`);
        }
        
        updateReceivedPointsWithoutMultiplier(userId, username, bet); 
      } else {
        updateReceivedPointsWithoutMultiplier(userId, username, -bet); 
        editMessageText(chatId, messageId, `🎰 🍒 | 🍋 | 🍊 🎰\n💸 @${username} потерял(а) ${bet} молодцов...`);
      }
      
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
if (text.startsWith("/random")) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rawData = sheet.getDataRange().getValues().slice(1)
      .filter(row => row[0] && row[1] && typeof row[0] === 'number' && typeof row[1] === 'string');
    
    if (rawData.length < 2) {
      sendMessage(chatId, "❌ Недостаточно участников для розыгрыша!");
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    const users = rawData.map(row => ({
      id: row[0],
      username: row[1],
      points: parseInt(row[2]) || 0,
      given: parseInt(row[3]) || 0
    })).filter(user => user.username);
    
    
    let weightedUsers = [];
    users.forEach(user => {
      const userEffects = checkUserEffects(user.id);
      const weight = userEffects.priorityRandom ? 3 : 1; 
      
      for (let i = 0; i < weight; i++) {
        weightedUsers.push(user);
      }
    });
    
    if (weightedUsers.length === 0) {
      weightedUsers = users; 
    }
    
    const loadingMsg = sendMessage(chatId, "⏳ Выбираю случайного молодца...");
    Utilities.sleep(800);
    const messageId = loadingMsg.result.message_id;
    
    let lastUsername = "";
    const uniqueUsernames = [...new Set(users.map(u => u.username))];
    
    for (let i = 0; i < 5; i++) {
      let randomName;
      do {
        randomName = uniqueUsernames[Math.floor(Math.random() * uniqueUsernames.length)];
      } while (randomName === lastUsername);
      
      lastUsername = randomName;
      editMessageText(chatId, messageId, `🎯 Рандомный молодец: <b>${randomName}</b>`);
      Utilities.sleep(500);
    }
    
    let winner;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      const index = Math.floor(Math.random() * weightedUsers.length);
      winner = weightedUsers[index];
      attempts++;
      
      if (winner && winner.id && winner.username) {
        break;
      }
    } while (attempts < maxAttempts);
    
    if (!winner || !winner.id || !winner.username) {
      sendMessage(chatId, "❌ Не удалось выбрать победителя. Попробуйте снова.");
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    updateReceivedPoints(winner.id, winner.username, 1);
    Utilities.sleep(500);
    
    
    const userEffects = checkUserEffects(winner.id);
    let priorityUsed = false;
    if (userEffects.priorityRandom) {
      
      
      priorityUsed = true;
    }
    
    let finalText = `🏆 Победитель: <b>@${winner.username}</b> получает +1️⃣ молодца!`;
    if (priorityUsed) {
      finalText += ` 🎯 (MLD приоритет)`;
    }
    
    editMessageText(chatId, messageId, finalText);
    deleteMessage(chatId, msg.message_id);
    
  } catch (error) {
    Logger.log(`Критическая ошибка: ${error}`);
    sendMessage(chatId, error);
    deleteMessage(chatId, msg.message_id);
  }
  return;
}

    
    
    
    if (text.startsWith("/mld_shop")) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
      
      if (!shopSheet) {
        initializeMldSheets();
        shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
      }
      
      const shopData = shopSheet.getDataRange().getValues().slice(1);
      const availableItems = shopData.filter(item => (parseInt(item[4]) || 0) > 0);
      
      if (availableItems.length === 0) {
        sendMessage(chatId, "🏪 Магазин временно пуст");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      let msgText = `🏪 <b>MLD Магазин</b>\n\n`;
      
      
      const categories = {
        premium: "✨ Премиум функции:",
        physical: "📦 Физические товары:",
        limited: "⏳ Лимитированные товары:",
        special: "⭐ Специальные товары:",
        merch: "🛍️ Мерчендайз:"
      };
      
      Object.keys(categories).forEach(category => {
        const categoryItems = availableItems.filter(item => item[5] === category);
        if (categoryItems.length > 0) {
          msgText += `${categories[category]}\n`;
          categoryItems.forEach(item => {
            msgText += `   <b>${item[1]}</b> <code>[${item[0]}]</code> - ${item[3]} MLD\n`;
            msgText += `   ${item[2]}\n`;
            msgText += `   Доступно: ${item[4]} шт.\n\n`;
          });
        }
      });
      
      msgText += `💡 Для покупки: <code>/buy_item [ID_товара]</code>`;
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/mld_top")) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
      
      if (!mldSheet) {
        sendMessage(chatId, "❌ Система MLD не инициализирована");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const data = mldSheet.getDataRange().getValues().slice(1);
      const topHolders = data
        .filter(row => (parseFloat(row[2]) || 0) > 0)
        .sort((a, b) => (parseFloat(b[2]) || 0) - (parseFloat(a[2]) || 0))
        .slice(0, 10);
      
      if (topHolders.length === 0) {
        sendMessage(chatId, "❌ Пока нет держателей MLD");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      let msgText = `🏆 <b>Топ держателей MLD</b>\n\n`;
      
      topHolders.forEach((holder, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
        const balance = parseFloat(holder[2]) || 0;
        const totalMined = parseFloat(holder[3]) || 0;
        msgText += `${medal} <b>${holder[1]}</b>: ${balance} MLD`;
        if (totalMined > 0) {
          msgText += ` (⛏️${totalMined})`;
        }
        msgText += `\n`;
      });
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/mld_market")) {
      const properties = PropertiesService.getScriptProperties();
      const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
      const dailyVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
      const currentPrice = getMldPrice();
      
      const halvingLevel = Math.floor(totalSupply / MLD_CONFIG.HALVING_INTERVAL);
      const nextHalving = (halvingLevel + 1) * MLD_CONFIG.HALVING_INTERVAL;
      const remainingToHalving = nextHalving - totalSupply;
      
      let msgText = `📊 <b>MLD Рынок</b>\n\n`;
      msgText += `💎 Курс: <b>${currentPrice} молодцов</b>\n`;
      msgText += `🏭 Выпущено: <b>${totalSupply}/${MLD_CONFIG.MAX_SUPPLY} MLD</b>\n`;
      msgText += `📈 Объем 24ч: <b>${dailyVolume} MLD</b>\n`;
      msgText += `⚡ Уровень халвинга: <b>${halvingLevel}</b>\n`;
      
      if (totalSupply < MLD_CONFIG.MAX_SUPPLY) {
        msgText += `🔜 До халвинга: <b>${remainingToHalving} MLD</b>\n`;
      }
      
      msgText += `\n💡 Текущие награды за майнинг:\n`;
      const currentRewards = MLD_CONFIG.MINING_REWARDS;
      const halvingMultiplier = 1 / Math.pow(2, halvingLevel);
      msgText += `🥇 Топ-1: ${(currentRewards.DAILY_TOP_1 * halvingMultiplier).toFixed(4)} MLD\n`;
      msgText += `🥈 Топ-2: ${(currentRewards.DAILY_TOP_2 * halvingMultiplier).toFixed(4)} MLD\n`;
      msgText += `🥉 Топ-3: ${(currentRewards.DAILY_TOP_3 * halvingMultiplier).toFixed(4)} MLD\n`;
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text === "/mld" || text.startsWith("/mld ")) {
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      
      const mldBalance = getUserMldBalance(userId);
      const currentPrice = getMldPrice();
      const properties = PropertiesService.getScriptProperties();
      const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
      const dailyVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
      
      let msgText = `💰 <b>MLD кошелек @${username}</b>\n\n`;
      msgText += `🪙 Баланс: <b>${mldBalance} MLD</b>\n`;
      msgText += `📈 Текущий курс: <b>${currentPrice} молодцов за 1 MLD</b>\n`;
      msgText += `🏭 Выпущено: <b>${totalSupply}/${MLD_CONFIG.MAX_SUPPLY} MLD</b>\n`;
      msgText += `📊 Объем за 24ч: <b>${dailyVolume} MLD</b>\n\n`;
      msgText += `💡 <i>Используйте /buy_mld, /sell_mld, /mld_shop</i>`;
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }

    
  if (text.startsWith("/mld_cashout")) {
      const args = text.split(" ");
      if (args.length < 2) {
        sendMessage(chatId, "❌ Укажите количество MLD для конвертации!\nПример: /mld_cashout 1.5");
        deleteMessage(chatId, msg.message_id);
        return;
      }

      const mldAmount = parseFloat(args[1]);
      if (!mldAmount || mldAmount <= 0) {
        sendMessage(chatId, "❌ Количество должно быть положительным числом!");
        deleteMessage(chatId, msg.message_id);
        return;
      }

      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      const balance = getUserMldBalance(userId);
      if (balance < mldAmount) {
        sendMessage(chatId, `❌ Недостаточно MLD! Ваш баланс: ${balance} MLD`);
        deleteMessage(chatId, msg.message_id);
        return;
      }

      
      let usdRub = 0;
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('Доллар');
        const raw = sheet ? String(sheet.getRange('A1').getValue()) : '0';
        usdRub = parseFloat(raw.replace(',', '.')) || 0;
      } catch (e) {
        usdRub = 0;
      }
      if (usdRub <= 0) {
        sendMessage(chatId, '❌ Не удалось получить курс доллара. Попробуйте позже.');
        deleteMessage(chatId, msg.message_id);
        return;
      }

      
      const usdAmount = mldAmount * 10;
      const rubAmount = Math.round(usdAmount * usdRub);
      const MIN_RUB = 5000;
      const MAX_RUB = 30000;
      if (rubAmount < MIN_RUB) {
        sendMessage(chatId, `❌ Минимальная сумма к выводу — ${MIN_RUB.toLocaleString('ru-RU')} ₽.\nВаш эквивалент: ${rubAmount.toLocaleString('ru-RU')} ₽`);
        deleteMessage(chatId, msg.message_id);
        return;
      }
      if (rubAmount > MAX_RUB) {
        sendMessage(chatId, `❌ Максимальная сумма к выводу — ${MAX_RUB.toLocaleString('ru-RU')} ₽ за транзакцию.\nВаш эквивалент: ${rubAmount.toLocaleString('ru-RU')} ₽`);
        deleteMessage(chatId, msg.message_id);
        return;
      }

      
      updateUserMldBalance(userId, username, -mldAmount, 'cashout_request', 0);

      
      const adminMsg = `💸 Запрос вывода MLD → ₽\nИнициатор: @${username} (${userId})\nСумма: ${mldAmount} MLD = ${usdAmount.toFixed(2)} $ = ${rubAmount.toLocaleString('ru-RU')} ₽\nКурс: ${usdRub} ₽/$\n`;
      sendMessage(ADMIN_CHAT_ID, adminMsg);

      sendMessage(chatId, `✅ Заявка на конвертацию принята!\nСумма к выплате: ${rubAmount.toLocaleString('ru-RU')} ₽ по курсу ${usdRub} ₽/$\nОжидайте поступления на карту. Если что — свяжется администратор.`);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/buy_mld")) {
      const args = text.split(" ");
      if (args.length < 2) {
        sendMessage(chatId, "❌ Укажите количество MLD для покупки!\nПример: /buy_mld 0.5");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const mldAmount = parseFloat(args[1]);
      if (!mldAmount || mldAmount <= 0) {
        sendMessage(chatId, "❌ Количество должно быть положительным числом!");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      const currentPrice = getMldPrice();
      const totalCost = Math.ceil(mldAmount * currentPrice);
      
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let userPoints = 0;
      let userRowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
          userPoints = parseInt(data[i][2], 10) || 0;
          userRowIndex = i;
          break;
        }
      }
      
      if (userPoints < totalCost) {
        sendMessage(chatId, `❌ Недостаточно молодцов! Нужно: ${totalCost}, у вас: ${userPoints}`);
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      
      const properties = PropertiesService.getScriptProperties();
      const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
      
      if (totalSupply + mldAmount > MLD_CONFIG.MAX_SUPPLY) {
        const available = MLD_CONFIG.MAX_SUPPLY - totalSupply;
        sendMessage(chatId, `❌ Недостаточно MLD в обращении! Доступно: ${available} MLD`);
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      
      updateReceivedPointsWithoutMultiplier(userId, username, -totalCost);
      updateUserMldBalance(userId, username, mldAmount, "buy", totalCost);
      
      
      properties.setProperty("MLD_TOTAL_SUPPLY", (totalSupply + mldAmount).toString());
      
      sendMessage(chatId, `✅ Покупка завершена!\n💰 Потрачено: ${totalCost} молодцов\n🪙 Получено: ${mldAmount} MLD\n📈 Курс: ${currentPrice} молодцов за MLD`);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/sell_mld")) {
      const args = text.split(" ");
      if (args.length < 2) {
        sendMessage(chatId, "❌ Укажите количество MLD для продажи!\nПример: /sell_mld 0.3");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const mldAmount = parseFloat(args[1]);
      if (!mldAmount || mldAmount <= 0) {
        sendMessage(chatId, "❌ Количество должно быть положительным числом!");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      const userMldBalance = getUserMldBalance(userId);
      
      if (userMldBalance < mldAmount) {
        sendMessage(chatId, `❌ Недостаточно MLD! У вас: ${userMldBalance} MLD`);
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const currentPrice = getMldPrice();
      const totalEarnings = Math.floor(mldAmount * currentPrice);
      
      
      updateUserMldBalance(userId, username, -mldAmount, "sell", totalEarnings);
      updateReceivedPointsWithoutMultiplier(userId, username, totalEarnings);
      
      
      const properties = PropertiesService.getScriptProperties();
      const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
      properties.setProperty("MLD_TOTAL_SUPPLY", Math.max(0, totalSupply - mldAmount).toString());
      
      sendMessage(chatId, `✅ Продажа завершена!\n🪙 Продано: ${mldAmount} MLD\n💰 Получено: ${totalEarnings} молодцов\n📈 Курс: ${currentPrice} молодцов за MLD`);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/mld_market")) {
      const properties = PropertiesService.getScriptProperties();
      const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
      const dailyVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
      const currentPrice = getMldPrice();
      
      const halvingLevel = Math.floor(totalSupply / MLD_CONFIG.HALVING_INTERVAL);
      const nextHalving = (halvingLevel + 1) * MLD_CONFIG.HALVING_INTERVAL;
      const remainingToHalving = nextHalving - totalSupply;
      
      let msgText = `📊 <b>MLD Рынок</b>\n\n`;
      msgText += `💎 Курс: <b>${currentPrice} молодцов</b>\n`;
      msgText += `🏭 Выпущено: <b>${totalSupply}/${MLD_CONFIG.MAX_SUPPLY} MLD</b>\n`;
      msgText += `📈 Объем 24ч: <b>${dailyVolume} MLD</b>\n`;
      msgText += `⚡ Уровень халвинга: <b>${halvingLevel}</b>\n`;
      
      if (totalSupply < MLD_CONFIG.MAX_SUPPLY) {
        msgText += `🔜 До халвинга: <b>${remainingToHalving} MLD</b>\n`;
      }
      
      msgText += `\n💡 Текущие награды за майнинг:\n`;
      const currentRewards = MLD_CONFIG.MINING_REWARDS;
      const halvingMultiplier = 1 / Math.pow(2, halvingLevel);
      msgText += `🥇 Топ-1: ${(currentRewards.DAILY_TOP_1 * halvingMultiplier).toFixed(4)} MLD\n`;
      msgText += `🥈 Топ-2: ${(currentRewards.DAILY_TOP_2 * halvingMultiplier).toFixed(4)} MLD\n`;
      msgText += `🥉 Топ-3: ${(currentRewards.DAILY_TOP_3 * halvingMultiplier).toFixed(4)} MLD\n`;
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/mld_top")) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mldSheet = spreadsheet.getSheetByName(MLD_SHEET_NAME);
      
      if (!mldSheet) {
        sendMessage(chatId, "❌ Система MLD не инициализирована");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const data = mldSheet.getDataRange().getValues().slice(1);
      const topHolders = data
        .filter(row => (parseFloat(row[2]) || 0) > 0)
        .sort((a, b) => (parseFloat(b[2]) || 0) - (parseFloat(a[2]) || 0))
        .slice(0, 10);
      
      if (topHolders.length === 0) {
        sendMessage(chatId, "❌ Пока нет держателей MLD");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      let msgText = `🏆 <b>Топ держателей MLD</b>\n\n`;
      
      topHolders.forEach((holder, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
        const balance = parseFloat(holder[2]) || 0;
        const totalMined = parseFloat(holder[3]) || 0;
        msgText += `${medal} <b>${holder[1]}</b>: ${balance} MLD`;
        if (totalMined > 0) {
          msgText += ` (⛏️${totalMined})`;
        }
        msgText += `\n`;
      });
      
      sendMessage(chatId, msgText);
      deleteMessage(chatId, msg.message_id);
      return;
    }
    
    
    if (text.startsWith("/buy_item")) {
      const args = text.split(" ");
      if (args.length < 2) {
        sendMessage(chatId, "❌ Укажите ID товара!\nПример: <code>/buy_item roulette_boost</code>");
        deleteMessage(chatId, msg.message_id);
        return;
      }
      
      const itemId = args.slice(1).join("_").toLowerCase();
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name;
      
      const result = purchaseMldItem(userId, username, itemId);
      sendMessage(chatId, result.message);
      deleteMessage(chatId, msg.message_id);
      return;
    }
  }
  
  
  if (checkSelfProclamation(text)) {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || "Неизвестный";
    createMolodecVoting(chatId, userId, username, text, msg.message_id);
  }
  


try {
  const useful = analyzeMessage(text);
  if (useful) {
    const userId   = msg.from.id;
    const username = msg.from.username || msg.from.first_name || "Неизвестный";
    
    
    const loadingMsg = sendMessage(chatId, "⏳ Кажется, сообщение полезное, но нужно убедиться...", msg.message_id);
    Utilities.sleep(1000); 
    
    
    updateReceivedPoints(userId, username, 1);
    
    try {
      incNeuroCountAndAward(userId, username);
    } catch (e2) {
      Logger.log("Ошибка нейро-награды: " + e2);
    }
    
    
    const replyText = `🤖 ИИ посчитал сообщение полезным! @${username} получил(а) +1️⃣ нейромолодца.`;
    
    
    editMessageText(chatId, loadingMsg.result.message_id, replyText);
    
    
    Utilities.sleep(2000);
    deleteMessage(chatId, loadingMsg.result.message_id);
  }
} catch (e) {
  Logger.log("Ошибка: " + e);
}  
}



function sendMessage(chatId, text, replyTo=null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };
  if (replyTo) payload.reply_to_message_id = replyTo;
  try {
    const response = UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { 
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
      }
    );
    return JSON.parse(response.getContentText());
  } catch (err) {
    Logger.log("Ошибка отправки: " + err);
  }
}


function sendDocument(chatId, pdfBlob, filename, caption = null) {
  try {
    const payload = {
      'chat_id': String(chatId),
      'document': pdfBlob.setName(filename)
    };
    
    if (caption) {
      payload['caption'] = caption;
      payload['parse_mode'] = 'HTML';
    }
    
    const response = UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`,
      {
        method: 'POST',
        payload: payload,
        muteHttpExceptions: true
      }
    );
    
    const responseText = response.getContentText();
    Logger.log(`Ответ API sendDocument: ${responseText}`);
    
    if (response.getResponseCode() !== 200) {
      Logger.log(`Ошибка HTTP: ${response.getResponseCode()}`);
      return null;
    }
    
    return JSON.parse(responseText);
  } catch (err) {
    Logger.log("Ошибка отправки документа: " + err);
    return null;
  }
}


function updatePoints(userId, username, delta) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const oldVal = parseInt(data[i][2], 10) || 0;
      sheet.getRange(i+1, 3).setValue(oldVal + delta);
      return;
    }
  }
  sheet.appendRow([userId, username, delta]);
}

function resetPointsMonthly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues().slice(1);
  if (!data.length) return sendMessage("-1002273642705", "Пока нет зарегистрированных пользователей.");

  const topReceived = data.map(r => ({ u: r[1], p: parseInt(r[2], 10) || 0 }))
                          .sort((a, b) => b.p - a.p)
                          .slice(0, 5);

  const topGiven = data.map(r => ({ u: r[1], g: parseInt(r[3], 10) || 0 }))
                       .sort((a, b) => b.g - a.g)
                       .slice(0, 5);

  
  Logger.log("Начинаем анализ топ-пользователей...");
  const analysisResults = analyzeTopUsersMessages(topReceived);
  
  
  Logger.log("Создаем PDF отчет...");
  const pdfData = createMonthlyPDF(topReceived, topGiven, analysisResults);

  
  const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];

  let message = "🌟 Итоги месяца 🌟\n\n🏆 Лучшие по полученным молодцам:\n";

  topReceived.forEach((u, i) => {
    message += `\n${medals[i]} ${u.u} — ${u.p} (${getRank(u.p)})`;

    
    if (i < 3) {
      message += `\n💡 Награда: право конвертировать MLD по текущему курсу. Используйте /mld_cashout`;
    }
    
    
    if (analysisResults) {
      const userAnalysis = analysisResults.find(a => a.username === u.u);
      if (userAnalysis && userAnalysis.analysis) {
        const shortAnalysis = userAnalysis.analysis.length > 100 
          ? userAnalysis.analysis.substring(0, 100) + "..."
          : userAnalysis.analysis;
        message += `\n📝 ${shortAnalysis}`;
      }
    }
  });

  message += "\n\n📤 Топ по выданным молодцам:\n";

  topGiven.forEach((u, i) => {
    message += `\n${i + 1}. ${u.u} — ${u.g} молодцов`;
    if (i < 3) {
      message += `\n💡 Бонус: повышенный приоритет в очереди /mld_cashout`;
    }
  });

  message += "\n\n✨ Благодарим всех за активность! Новый месяц — новые возможности.";

  
  sendMessage(ADMIN_CHAT_ID, message);

  
  if (pdfData && pdfData.blob) {
    const caption = `📄 Подробный отчет с анализом ИИ за ${new Date().toLocaleDateString("ru-RU")}`;
    const result = sendDocument(ADMIN_CHAT_ID, pdfData.blob, pdfData.filename, caption);
    
    if (result && result.ok) {
      Logger.log("PDF файл успешно отправлен в чат");
    } else {
      Logger.log("Ошибка при отправке PDF файла");
      
      sendMessage(ADMIN_CHAT_ID, "❌ Не удалось отправить PDF отчет. Проверьте логи для получения подробной информации.");
    }
  } else {
    sendMessage(ADMIN_CHAT_ID, "❌ Не удалось создать PDF отчет.");
  }

  
  for (let i = 1; i <= data.length; i++) {
    sheet.getRange(i + 1, 3).setValue(0); 
    sheet.getRange(i + 1, 4).setValue(0); 
  }
  
  
  const messagesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MOLODEC_MESSAGES_SHEET);
  if (messagesSheet) {
    messagesSheet.clear();
    
    messagesSheet.getRange(1, 1, 1, 8).setValues([[
      "Дата", "Отправитель ID", "Отправитель", "Получатель ID", "Получатель", "Текст сообщения", "Тип молодца", "Очки"
    ]]);
    messagesSheet.getRange(1, 1, 1, 8).setFontWeight("bold");
  }
}




function currentScore() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues().slice(1);

  if (!data.length) {
    return sendMessage("-1002273642705", "🚫 Пока нет зарегистрированных пользователей.");
  }

  
  const topReceived = data
    .map(r => ({ u: r[1], p: parseInt(r[2], 10) || 0, id: r[0] }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 10);

  const topGiven = data
    .map(r => ({ u: r[1], g: parseInt(r[3], 10) || 0, id: r[0] }))
    .filter(r => r.g > 0)
    .sort((a, b) => b.g - a.g)
    .slice(0, 5);

  
  let msg = `<b>🏆 Ежедневный топ по молодцам</b> 📅 ${new Date().toLocaleDateString("ru-RU")}\n\n`;

  msg += `<b>📬 Полученные молодцы:</b>\n`;
  topReceived.forEach((user, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    msg += `${medal} ${i + 1}. <b>${user.u}</b> — ${user.p} (${getRank(user.p)})\n`;
  });

  
  const miningLines = [];
  topReceived.slice(0, 3).forEach((user, i) => {
    const rewardType = i === 0 ? "daily_top_1" : i === 1 ? "daily_top_2" : "daily_top_3";
    const res = miningMldReward(user.id, user.u, rewardType, false);
    if (res && res.message) miningLines.push(res.message);
  });

  msg += `\n<b>🎯 Выданные молодцы:</b>\n`;
  topGiven.forEach((user, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    msg += `${medal} ${i + 1}. <b>${user.u}</b> — ${user.g}\n`;
  });

  
  sendMessage("-1002273642705", msg);

  
  
  const miningLinesGiven = [];
  topGiven.slice(0, 3).forEach((user, i) => {
    const rewardType = i === 0 ? "daily_given_top_1" : i === 1 ? "daily_given_top_2" : "daily_given_top_3";
    const res = miningMldReward(user.id || user.u, user.u, rewardType, false);
    if (res && res.message) miningLinesGiven.push(res.message);
  });

  const lines = [].concat(miningLines, miningLinesGiven);
  if (lines.length > 0) {
    const miningMsg = `⛏️ Майнинг MLD!\n` + lines.join('\n');
    sendMessage("-1002273642705", miningMsg);
  }
}



function testSendMessage() {
  sendMessage(667861609, "Тестовое сообщение от бота");
}


function deleteMessage(chatId, messageId) {
  const payload = { chat_id: chatId, message_id: messageId };
  try {
    UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`,
      { 
        method: "post", 
        contentType: "application/json", 
        payload: JSON.stringify(payload),
        muteHttpExceptions: true 
      }
    );
  } catch (err) {
    Logger.log("Ошибка при удалении сообщения: " + err);
  }
}

function analyzeMessage(text) {
  const GEN_API_KEY = "sk-quZucrZKmPAqzsM0kMpiiDdnINwQNboGChj1NfzUOLpgjEcmgbobr1Ot4gGK";
  const networkId   = "gpt-4o-mini";
  const baseUrl     = "https://api.gen-api.ru/api/v1/networks";
  const adminChatId = 667861609;

  function isUsefulByKeywords(t) {
    const keywords = [];
    let cnt = 0;
    const lower = t.toLowerCase();
    keywords.forEach(k => { if (lower.includes(k)) cnt++; });
    return cnt >= 1 && t.length > 10;
  }

  const messages = [
    { role: "system", content: "Ты — эксперт по оценке сообщений в чате. Твоя задача — определить, содержит ли сообщение информацию о полезном действии автора. К полезным действиям относятся: деление ценным опытом или знаниями; выполнение задач; успешные продажи. Что не относится к полезным действиям: благодарность; выдача поручений; вопросы. Отвечай строго одним словом: \"Да\" или \"Нет\" без лишних символов и пояснений." },
    { role: "user", content: text }
  ];

  
  let initResp;
  try {
    initResp = UrlFetchApp.fetch(
      `${baseUrl}/${networkId}`, {
        method:      "post",
        contentType: "application/json",
        headers:     { "Authorization": "Bearer " + GEN_API_KEY },
        payload:     JSON.stringify({ messages }),
        muteHttpExceptions: true
      }
    );
  } catch (e) {
    return isUsefulByKeywords(text);
  }
  if (initResp.getResponseCode() === 402) return isUsefulByKeywords(text);
  if (initResp.getResponseCode() !== 200) return isUsefulByKeywords(text);
  sendMessage(adminChatId, `Response: ${initResp.getResponseCode()}`);

  const initJson = JSON.parse(initResp.getContentText());
  const requestId = initJson.request_id;

  
  const statusUrl = `https://api.gen-api.ru/api/v1/request/get/${requestId}`;
  let answerText = null;
  for (let i = 0; i < 10; i++) {
    Utilities.sleep(100);
    let statusResp;
    try {
      statusResp = UrlFetchApp.fetch(statusUrl, { headers: { "Authorization": "Bearer " + GEN_API_KEY }, muteHttpExceptions: true });
    } catch (e) {
      break;
    }
    const raw = statusResp.getContentText();
    if (statusResp.getResponseCode() !== 200) break;
    const j = JSON.parse(raw);
    if (j.status === "success") {
      
      answerText = typeof j.output === 'string' ? j.output
                  : Array.isArray(j.result) && j.result[0] ? j.result[0]  
                  : Array.isArray(j.full_response) && j.full_response[0]?.message?.content ? j.full_response[0].message.content
                  : null;
      break;
    }
    if (j.status === "failed") break;
  }

  
  if (!answerText) return isUsefulByKeywords(text);
  let answer = String(answerText).trim().toLowerCase().replace(/[^а-яё]+$/u, "");
  return answer === "да" ? true : answer === "нет" ? false : isUsefulByKeywords(text);
}


function updateReceivedPoints(userId, username, delta) {
  
  delta = Number(delta) || 0;
  
  
  const multiplier = getKarmaMultiplier();
  
  
  const newDelta = Math.round(delta * multiplier);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const oldPoints = parseInt(data[i][2], 10) || 0;
      const newPoints = oldPoints + newDelta;
      
      
      sheet.getRange(i+1, 3).setValue(newPoints);
      
      
      const oldRank = getRank(oldPoints);
      const newRank = getRank(newPoints);
      if (oldRank !== newRank) {
        const msg = `🎉 @${username}  достиг(ла) ранга «${newRank}»!`;
        sendMessage(-1002273642705, msg);
      }
      
      
      checkStreakBonus(userId, username);
      
      return;
    }
  }
  
  
  sheet.appendRow([userId, username, newDelta, 0]);
  const newRank = getRank(newDelta);
  const congrats = `🎉 @${username}  достиг(ла) ранга «${newRank}»!`;
  sendMessage(-1002273642705, congrats);
  
  
  checkStreakBonus(userId, username);

}


function updateReceivedPointsWithoutMultiplier(userId, username, delta) {
  
  delta = Number(delta) || 0;
  
  

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const oldPoints = parseInt(data[i][2], 10) || 0;
      const newPoints = oldPoints + delta;
      
      
      sheet.getRange(i+1, 3).setValue(newPoints);
      
      
      const oldRank = getRank(oldPoints);
      const newRank = getRank(newPoints);
      if (oldRank !== newRank) {
        const msg = `🎉 @${username} достиг(ла) ранга «${newRank}»!`;
        sendMessage(-1002273642705, msg);
      }
      
      return;
    }
  }
  
  
  sheet.appendRow([userId, username, delta, 0]);
  const newRank = getRank(delta);
  const congrats = `🎉 @${username} достиг(ла) ранга «${newRank}»!`;
  sendMessage(-1002273642705, congrats);
}




function updateReceivedPointsDirectly(userId, username, delta) {
  
  delta = Number(delta) || 0;
  
  
  const multiplier = getKarmaMultiplier();
  
  
  const newDelta = Math.round(delta * multiplier);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      const oldPoints = parseInt(data[i][2], 10) || 0;
      const newPoints = oldPoints + newDelta;
      
      
      sheet.getRange(i+1, 3).setValue(newPoints);
      
      
      const oldRank = getRank(oldPoints);
      const newRank = getRank(newPoints);
      if (oldRank !== newRank) {
        const msg = `🎉 @${username} достиг(ла) ранга «${newRank}»!`;
        sendMessage(-1002273642705, msg);
      }
      
      return;
    }
  }
  
  
  sheet.appendRow([userId, username, newDelta, 0]);
  const newRank = getRank(newDelta);
  const congrats = `🎉 @${username} достиг(ла) ранга «${newRank}»!`;
  sendMessage(-1002273642705, congrats);
}


function updateGivenCount(chatId, userId, username, delta) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues(); 
  
  
  if (data[0].length < 5) {
    sheet.getRange(1, 5).setValue("LAST_ACTIVITY");
  }
  
  
  for (let i = 1; i < data.length; i++) { 
    if (String(data[i][0]) === String(userId)) { 
      const currentGiven = parseInt(data[i][3], 10) || 0; 
      sheet.getRange(i + 1, 4).setValue(currentGiven + delta); 
      
      
      sheet.getRange(i + 1, 5).setValue(new Date().toISOString());

      
      if (Math.random() < 0.05) { 
        updateReceivedPoints(userId, username, 1); 
        sendMessage(chatId, `🙏 @${username}  получил(а) +1️⃣ молодца за щедрость!`);
      }
      
      try {
        for (let step = 0; step < delta; step++) {
          checkGivenMilestoneAndAwardMld(userId, username);
        }
      } catch (e) {
        Logger.log('Ошибка при начислении MLD за выданные: ' + e);
      }
      return; 
    }
  }
  
  
  sheet.appendRow([userId, username, 0, delta, new Date().toISOString()]); 
  
  
  
  if (Math.random() < 0.05) {
    updateReceivedPoints(userId, username, 1);
    sendMessage(chatId, `🙏 @${username}  получил(а) +1️⃣ молодца за щедрость!`);
  }
  
  try {
    for (let step = 0; step < delta; step++) {
      checkGivenMilestoneAndAwardMld(userId, username);
    }
  } catch (e) {
    Logger.log('Ошибка при начислении MLD за выданные (new user): ' + e);
  }
}

function sendDynamicMessage(chatId, initialText, finalText, delay = 1000) {
  
  const tempMessage = sendMessage(chatId, initialText);
  
  
  Utilities.sleep(delay);
  
  
  editMessageText(chatId, tempMessage.result.message_id, finalText);
}

function editMessageText(chatId, messageId, text) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: "HTML"
  };
  
  try {
    UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
  } catch (error) {
    Logger.log(`Ошибка редактирования сообщения ${messageId}: ${error.message}`);
  }
}




function dailyPenaltyCheck() {
  
  PropertiesService.getScriptProperties().setProperty("MLD_DAILY_VOLUME", "0");
  
  sendMessage(ADMIN_CHAT_ID, "✅ Ежедневная проверка завершена");
}


function initializeMldSystem() {
  try {
    initializeMldSheets();
    sendMessage(ADMIN_CHAT_ID, "✅ Система MLD инициализирована!");
    Logger.log("MLD система успешно инициализирована");
  } catch (error) {
    Logger.log(`Ошибка инициализации MLD: ${error.message}`);
    sendMessage(ADMIN_CHAT_ID, `❌ Ошибка инициализации MLD: ${error.message}`);
  }
}


function testMldMining() {
  
  const testUserId = 667861609; 
  const testUsername = "TestUser";
  
  miningMldReward(testUserId, testUsername, "daily_top_1");
  Logger.log("Тест майнинга MLD завершен");
}

function getMldSystemStatus() {
  const properties = PropertiesService.getScriptProperties();
  const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
  const dailyVolume = parseFloat(properties.getProperty("MLD_DAILY_VOLUME") || "0");
  const currentPrice = getMldPrice();
  
  const halvingLevel = Math.floor(totalSupply / MLD_CONFIG.HALVING_INTERVAL);
  
  let status = `📊 Статус MLD системы:\n\n`;
  status += `💎 Текущий курс: ${currentPrice} молодцов за MLD\n`;
  status += `🏭 Выпущено: ${totalSupply}/${MLD_CONFIG.MAX_SUPPLY} MLD\n`;
  status += `📈 Объем за 24ч: ${dailyVolume} MLD\n`;
  status += `⚡ Уровень халвинга: ${halvingLevel}\n`;
  status += `🔥 Коэффициент burn: ${(MLD_CONFIG.BURN_RATE * 100)}%\n`;
  
  sendMessage(ADMIN_CHAT_ID, status);
  return status;
}

function dailyCheck() {
  sendMessage(ADMIN_CHAT_ID, "✅ Ежедневная проверка завершена");
}


function checkStreakBonus(userId, username) {
  const properties = PropertiesService.getScriptProperties();
  const streakKey = `streak_${userId}`;
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  const streakData = properties.getProperty(streakKey);
  let currentStreak = 0;
  
  if (streakData) {
    const data = JSON.parse(streakData);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = Utilities.formatDate(yesterday, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    if (data.lastDate === yesterdayStr) {
      currentStreak = data.streak + 1;
    } else if (data.lastDate !== today) {
      currentStreak = 1;
    } else {
      return; 
    }
  } else {
    currentStreak = 1;
  }
  
  properties.setProperty(streakKey, JSON.stringify({
    streak: currentStreak,
    lastDate: today
  }));
  
  
  if (STREAK_BONUSES[currentStreak]) {
    const bonusData = STREAK_BONUSES[currentStreak];
    
    updateReceivedPointsDirectly(userId, username, bonusData.bonus);
    sendMessage(ADMIN_CHAT_ID, `@${username} ${bonusData.message} +${bonusData.bonus} молодцов!`);
    
    
    if (currentStreak === 7) {
      miningMldReward(userId, username, "streak_7");
    } else if (currentStreak === 14) {
      miningMldReward(userId, username, "streak_14");
    } else if (currentStreak === 30) {
      miningMldReward(userId, username, "streak_30");
    }
  }
}


function getUserStreak(userId) {
  const properties = PropertiesService.getScriptProperties();
  const streakKey = `streak_${userId}`;
  const streakData = properties.getProperty(streakKey);
  
  if (!streakData) return 0;
  
  const data = JSON.parse(streakData);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = Utilities.formatDate(yesterday, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  if (data.lastDate === today || data.lastDate === yesterdayStr) {
    return data.streak;
  }
  
  return 0; 
}




function debugMultiplierData() {
  const props = PropertiesService.getScriptProperties().getProperty(PROPERTIES_KEY);
  Logger.log(`Сырые данные из PropertiesService: "${props}"`);
  
  if (props) {
    try {
      const data = JSON.parse(props);
      Logger.log(`Распарсенные данные: multiplier=${data.multiplier}, date=${data.date}`);
    } catch (e) {
      Logger.log(`Ошибка парсинга JSON: ${e.message}`);
      Logger.log(`Данные не в формате JSON, возможно просто число: ${props}`);
    }
  } else {
    Logger.log("Данные отсутствуют");
  }
  
  
  const multiplier = getKarmaMultiplier();
  Logger.log(`Результат getKarmaMultiplier(): ${multiplier}`);
}


function setTodayMultiplier(multiplier = 2) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const data = {
    multiplier: multiplier,
    date: today
  };
  
  PropertiesService.getScriptProperties().setProperty(
    PROPERTIES_KEY,
    JSON.stringify(data)
  );
  
  Logger.log(`Установлен мультипликатор ${multiplier} на дату ${today}`);
  
  
  debugMultiplierData();
}


function clearMultiplierData() {
  PropertiesService.getScriptProperties().deleteProperty(PROPERTIES_KEY);
  Logger.log("Данные мультипликатора очищены");
}




function saveMolodecMessage(messageData) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let messagesSheet = spreadsheet.getSheetByName(MOLODEC_MESSAGES_SHEET);
    
    
    if (!messagesSheet) {
      messagesSheet = spreadsheet.insertSheet(MOLODEC_MESSAGES_SHEET);
      
      messagesSheet.getRange(1, 1, 1, 8).setValues([[
        "Дата", "Отправитель ID", "Отправитель", "Получатель ID", "Получатель", "Текст сообщения", "Тип молодца", "Очки"
      ]]);
      messagesSheet.getRange(1, 1, 1, 8).setFontWeight("bold");
    }
    
    
    messagesSheet.appendRow([
      messageData.messageDate,
      messageData.senderId,
      messageData.senderName,
      messageData.recipientId,
      messageData.recipientName,
      messageData.messageText,
      messageData.molodecType,
      messageData.points
    ]);
    
    Logger.log(`Сохранено сообщение: ${messageData.senderName} -> ${messageData.recipientName}`);
  } catch (error) {
    Logger.log(`Ошибка при сохранении сообщения: ${error.message}`);
  }
}




function analyzeTopUsersMessages(topUsers) {
  const GEN_API_KEY = "sk-quZucrZKmPAqzsM0kMpiiDdnINwQNboGChj1NfzUOLpgjEcmgbobr1Ot4gGK";
  const networkId = "gpt-4o-mini";
  const baseUrl = "https://api.gen-api.ru/api/v1/networks";
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const messagesSheet = spreadsheet.getSheetByName(MOLODEC_MESSAGES_SHEET);
    
    if (!messagesSheet) {
      Logger.log("Лист с сообщениями не найден");
      return null;
    }
    
    const messagesData = messagesSheet.getDataRange().getValues().slice(1); 
    const analysisResults = [];
    
    
    for (const user of topUsers) {
      Logger.log(`Анализируем пользователя: ${user.u}`);
      
      
      const userMessages = messagesData
        .filter(row => row[4] === user.u) 
        .map(row => row[5]) 
        .filter(text => text && text !== "Медиафайл")
        .slice(-20); 
      
      if (userMessages.length === 0) {
        analysisResults.push({
          username: user.u,
          points: user.p,
          analysis: "Пользователь получал молодцы за медиафайлы или сообщения без текста."
        });
        continue;
      }
      
      
      const messagesText = userMessages.join("\n---\n");
      const prompt = `Проанализируй сообщения пользователя ${user.u}, за которые он получил молодцы от коллег. Напиши краткую сводку (2-3 предложения) об основных качествах и достижениях этого человека на основе сообщений. Сообщения:\n\n${messagesText}`;
      
      const messages = [
        { 
          role: "system", 
          content: "Ты - эксперт по анализу профессиональной деятельности. Анализируй сообщения и выделяй ключевые достижения, навыки и качества сотрудника. Будь конкретным и позитивным."
        },
        { role: "user", content: prompt }
      ];
      
      
      const initResp = UrlFetchApp.fetch(
        `${baseUrl}/${networkId}`, {
          method: "post",
          contentType: "application/json",
          headers: { "Authorization": "Bearer " + GEN_API_KEY },
          payload: JSON.stringify({ messages }),
          muteHttpExceptions: true
        }
      );
      
      if (initResp.getResponseCode() !== 200) {
        Logger.log(`Ошибка API для ${user.u}: ${initResp.getResponseCode()}`);
        analysisResults.push({
          username: user.u,
          points: user.p,
          analysis: "Не удалось проанализировать сообщения пользователя."
        });
        continue;
      }
      
      const initJson = JSON.parse(initResp.getContentText());
      const requestId = initJson.request_id;
      
      
      const statusUrl = `https://api.gen-api.ru/api/v1/request/get/${requestId}`;
      let analysis = null;
      
      for (let i = 0; i < 15; i++) {
        Utilities.sleep(1000);
        
        const statusResp = UrlFetchApp.fetch(statusUrl, {
          headers: { "Authorization": "Bearer " + GEN_API_KEY },
          muteHttpExceptions: true
        });
        
        if (statusResp.getResponseCode() !== 200) break;
        
        const statusJson = JSON.parse(statusResp.getContentText());
        
        if (statusJson.status === "success") {
          analysis = statusJson.output || 
                    (statusJson.result && statusJson.result[0]) ||
                    (statusJson.full_response && statusJson.full_response[0]?.message?.content);
          break;
        }
        
        if (statusJson.status === "failed") break;
      }
      
      analysisResults.push({
        username: user.u,
        points: user.p,
        analysis: analysis || "Не удалось получить анализ от ИИ."
      });
    }
    
    return analysisResults;
    
  } catch (error) {
    Logger.log(`Ошибка при анализе пользователей: ${error.message}`);
    return null;
  }
}


function createMonthlyPDF(topReceived, topGiven, analysisResults) {
  try {
    
    const doc = DocumentApp.create(`Месячный отчет молодцов - ${new Date().toLocaleDateString("ru-RU")}`);
    const body = doc.getBody();
    
    
    const titleStyle = {};
    titleStyle[DocumentApp.Attribute.FONT_SIZE] = 24;
    titleStyle[DocumentApp.Attribute.BOLD] = true;
    titleStyle[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;
    
    const headingStyle = {};
    headingStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
    headingStyle[DocumentApp.Attribute.BOLD] = false;
    
    const subheadingStyle = {};
    subheadingStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
    subheadingStyle[DocumentApp.Attribute.BOLD] = false;
    
    
    const title = body.appendParagraph("🌟 ИТОГИ МЕСЯЦА 🌟");
    title.setAttributes(titleStyle);
    
    body.appendParagraph("").appendHorizontalRule();
    
    
    const receivedHeading = body.appendParagraph("🏆 ТОП ПО ПОЛУЧЕННЫМ МОЛОДЦАМ");
    receivedHeading.setAttributes(headingStyle);
    
  const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    
    topReceived.forEach((user, i) => {
      const userPara = body.appendParagraph(`${medals[i]} ${i+1}. ${user.u} — ${user.p} молодцов (${getRank(user.p)})`);
      userPara.setAttributes(subheadingStyle);
      const prizePara = body.appendParagraph(`💡 Награда: право конвертации MLD в рубли по текущему курсу (команда /mld_cashout)`);
      prizePara.setIndentFirstLine(20);
      
      
      if (analysisResults) {
        const userAnalysis = analysisResults.find(a => a.username === user.u);
        if (userAnalysis && userAnalysis.analysis) {
          const analysisPara = body.appendParagraph(`📝 ${userAnalysis.analysis}`);
          analysisPara.setIndentFirstLine(20);
        }
      }
      
      body.appendParagraph(""); 
    });
    
    body.appendParagraph("").appendHorizontalRule();
    
    
    const givenHeading = body.appendParagraph("📤 ТОП ПО ВЫДАННЫМ МОЛОДЦАМ");
    givenHeading.setAttributes(headingStyle);
    
    
    topGiven.forEach((user, i) => {
      const userPara = body.appendParagraph(`${i+1}. ${user.u} — ${user.g} молодцов`);
      userPara.setAttributes(subheadingStyle);
      const prizePara2 = body.appendParagraph(`💡 Бонус: приоритет в очереди на вывод через /mld_cashout`);
      prizePara2.setIndentFirstLine(20);
      body.appendParagraph(""); 
    });
    
    body.appendParagraph("").appendHorizontalRule();
    
    
    const conclusion = body.appendParagraph("✨ Благодарим всех за активность! Новый месяц — новые возможности для достижений и признания!");
    conclusion.setAttributes(subheadingStyle);
    
    
    doc.saveAndClose();
    
    const file = DriveApp.getFileById(doc.getId());
    const pdfBlob = file.getAs('application/pdf');
    
    
    const fileName = `Отчет_молодцы_${new Date().toISOString().slice(0,10)}.pdf`;
    
    
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    
    Logger.log(`PDF отчет создан: ${fileName}`);
    return {
      blob: pdfBlob,
      filename: fileName
    };
    
  } catch (error) {
    Logger.log(`Ошибка при создании PDF: ${error.message}`);
    return null;
  }
}




function testMonthlyReportGeneration() {
  try {
    Logger.log("🧪 Начинаем тестирование функционала месячного отчета...");
    
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const messagesSheet = spreadsheet.getSheetByName(MOLODEC_MESSAGES_SHEET);
    
    if (!messagesSheet) {
      Logger.log("❌ Лист с сообщениями не найден. Создаем тестовые данные...");
      createTestMessagesData();
    } else {
      Logger.log("✅ Лист с сообщениями найден");
    }
    
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues().slice(1);
    
    if (data.length === 0) {
      Logger.log("❌ Нет данных пользователей. Создаем тестовые данные...");
      createTestUsersData();
      return testMonthlyReportGeneration(); 
    }
    
    const topReceived = data.map(r => ({ u: r[1], p: parseInt(r[2], 10) || 0 }))
                            .sort((a, b) => b.p - a.p)
                            .slice(0, 5);
    
    const topGiven = data.map(r => ({ u: r[1], g: parseInt(r[3], 10) || 0 }))
                         .sort((a, b) => b.g - a.g)
                         .slice(0, 5);

    Logger.log(`📊 Топ-5 по полученным: ${topReceived.map(u => `${u.u}(${u.p})`).join(', ')}`);
    Logger.log(`📤 Топ-5 по выданным: ${topGiven.map(u => `${u.u}(${u.g})`).join(', ')}`);
    
    
    Logger.log("🤖 Запускаем анализ топ-пользователей через ИИ...");
    const analysisResults = analyzeTopUsersMessages(topReceived);
    
    if (analysisResults) {
      Logger.log("✅ Анализ ИИ завершен успешно");
      analysisResults.forEach(result => {
        Logger.log(`📝 ${result.username}: ${result.analysis.substring(0, 100)}...`);
      });
    } else {
      Logger.log("❌ Анализ ИИ не удался");
    }
    
    
    Logger.log("📄 Создаем PDF отчет...");
    const pdfData = createMonthlyPDF(topReceived, topGiven, analysisResults);
    
    if (pdfData && pdfData.blob) {
      Logger.log(`✅ PDF отчет создан: ${pdfData.filename}`);
      
      
      const caption = `🧪 ТЕСТ PDF ОТЧЕТА\n\n${analysisResults ? '✅ Анализ ИИ: успешно' : '❌ Анализ ИИ: ошибка'}`;
      const result = sendDocument(ADMIN_CHAT_ID, pdfData.blob, pdfData.filename, caption);
      
      if (result && result.ok) {
        Logger.log("📄 PDF тест-отчет успешно отправлен в чат");
      } else {
        Logger.log("❌ Ошибка отправки PDF тест-отчета");
        sendMessage(ADMIN_CHAT_ID, "❌ Тестирование завершено с ошибкой при отправке PDF");
      }
    } else {
      Logger.log("❌ Создание PDF не удалось");
      sendMessage(ADMIN_CHAT_ID, "❌ Тестирование: создание PDF не удалось");
    }
    
    Logger.log("🏁 Тестирование завершено");
    
  } catch (error) {
    Logger.log(`❌ Ошибка при тестировании: ${error.message}`);
    sendMessage(ADMIN_CHAT_ID, `❌ Ошибка тестирования: ${error.message}`);
  }
}


function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const callbackData = callbackQuery.data;
  const voterId = callbackQuery.from.id;
  const voterUsername = callbackQuery.from.username || callbackQuery.from.first_name || "Неизвестный";
  
  
  if (callbackData.startsWith('vote_')) {
    handleMolodecVote(chatId, messageId, callbackData, voterId, voterUsername, callbackQuery.id);
    return;
  }
  
  
  answerCallbackQuery(callbackQuery.id, "Неизвестная команда");
}


function checkSelfProclamation(text) {
  const lowerText = text.toLowerCase();
  
  
  const hasYa = lowerText.includes('я ') || lowerText.startsWith('я') || lowerText.includes(' я');
  const hasMolodec = lowerText.includes('молодец');
  
  return hasYa && hasMolodec;
}


function createMolodecVoting(chatId, userId, username, originalText, originalMessageId) {
  const votingText = `🗳️ @${username} считает себя молодцом!

⏱️ Длительность голосования: ${VOTING_DURATION_MINUTES} минут
🎁 Награда: ${VOTING_REWARDS.MIN_REWARD}-${VOTING_REWARDS.MAX_REWARD} молодцов`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Да, молодец!", callback_data: `vote_yes_${userId}_${Date.now()}` },
        { text: "❌ Нет, не молодец", callback_data: `vote_no_${userId}_${Date.now()}` }
      ]
    ]
  };
  
  const payload = {
    chat_id: chatId,
    text: votingText,
    parse_mode: "HTML",
    reply_to_message_id: originalMessageId,
    reply_markup: JSON.stringify(keyboard)
  };
  
  try {
    const response = UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
      }
    );
    
    const result = JSON.parse(response.getContentText());
    
    if (result.ok) {
      
      const votingData = {
        chatId: chatId,
        messageId: result.result.message_id,
        targetUserId: userId,
        targetUsername: username,
        startTime: new Date().getTime(),
        votes: { yes: [], no: [] },
        originalText: originalText
      };
      
      
      const votingKey = `voting_${result.result.message_id}`;
      PropertiesService.getScriptProperties().setProperty(votingKey, JSON.stringify(votingData));
      
      
      const triggerTime = new Date();
      triggerTime.setMinutes(triggerTime.getMinutes() + VOTING_DURATION_MINUTES);
      
      const trigger = ScriptApp.newTrigger('finalizeVotingByTrigger')
        .timeBased()
        .at(triggerTime)
        .create();
      
      
      const triggerKey = `trigger_${result.result.message_id}`;
      PropertiesService.getScriptProperties().setProperty(triggerKey, trigger.getUniqueId());
      
      Logger.log(`Создано голосование для ${username}: ${votingKey}, триггер: ${trigger.getUniqueId()}`);
    }
  } catch (error) {
    Logger.log(`Ошибка создания голосования: ${error.message}`);
  }
}

function handleMolodecVote(chatId, messageId, callbackData, voterId, voterUsername, callbackQueryId) {
  const votingKey = `voting_${messageId}`;
  const votingDataStr = PropertiesService.getScriptProperties().getProperty(votingKey);
  
  if (!votingDataStr) {
    answerCallbackQuery(callbackQueryId, "❌ Голосование завершено или не найдено");
    return;
  }
  
  const votingData = JSON.parse(votingDataStr);
  
  
  if (voterId === votingData.targetUserId) {
    answerCallbackQuery(callbackQueryId, "❌ Нельзя голосовать за себя!");
    return;
  }
  
  
  const alreadyVotedYes = votingData.votes.yes.some(vote => vote.id === voterId);
  const alreadyVotedNo = votingData.votes.no.some(vote => vote.id === voterId);
  
  if (alreadyVotedYes || alreadyVotedNo) {
    answerCallbackQuery(callbackQueryId, "❌ Вы уже голосовали!");
    return;
  }
  
  
  const isYesVote = callbackData.includes('vote_yes');
  
  
  const vote = { id: voterId, username: voterUsername };
  if (isYesVote) {
    votingData.votes.yes.push(vote);
  } else {
    votingData.votes.no.push(vote);
  }
  
  
  PropertiesService.getScriptProperties().setProperty(votingKey, JSON.stringify(votingData));
  
  
  updateVotingMessage(chatId, messageId, votingData);
  
  const voteText = isYesVote ? "✅ За молодца!" : "❌ Против молодца!";
  answerCallbackQuery(callbackQueryId, voteText);
}



function updateVotingMessage(chatId, messageId, votingData) {
  const yesCount = votingData.votes.yes.length;
  const noCount = votingData.votes.no.length;
  
  let votingText = `🗳️ @${votingData.targetUsername} считает себя молодцом.\n\n`;
  votingText += `✅ За молодца: ${yesCount}\n❌ Против: ${noCount}`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: `✅ Да, молодец! (${yesCount})`, callback_data: `vote_yes_${votingData.targetUserId}_${Date.now()}` },
        { text: `❌ Нет, не молодец (${noCount})`, callback_data: `vote_no_${votingData.targetUserId}_${Date.now()}` }
      ]
    ]
  };
  
  editMessageTextWithKeyboard(chatId, messageId, votingText, JSON.stringify(keyboard));
}


function finalizeVoting(chatId, messageId) {
  const votingKey = `voting_${messageId}`;
  const votingDataStr = PropertiesService.getScriptProperties().getProperty(votingKey);
  
  if (!votingDataStr) return;
  
  const votingData = JSON.parse(votingDataStr);
  const yesCount = votingData.votes.yes.length;
  const noCount = votingData.votes.no.length;
  const totalVotes = yesCount + noCount;
  
  
  const triggerKey = `trigger_${messageId}`;
  const triggerId = PropertiesService.getScriptProperties().getProperty(triggerKey);
  if (triggerId) {
    try {
      const triggers = ScriptApp.getProjectTriggers();
      const trigger = triggers.find(t => t.getUniqueId() === triggerId);
      if (trigger) {
        ScriptApp.deleteTrigger(trigger);
        Logger.log(`Удален триггер: ${triggerId}`);
      }
    } catch (error) {
      Logger.log(`Ошибка удаления триггера: ${error.message}`);
    }
    PropertiesService.getScriptProperties().deleteProperty(triggerKey);
  }
  
  let finalText = "";
  let separateMessage = "";
  
  if (totalVotes === 0) {
    
    finalText = `🗳️ Голосование завершено!\n\n@${votingData.targetUsername} считает себя молодцом!\n\n🤷‍♂️ Результат: никто не проголосовал`;
    separateMessage = `📢 Голосование за @${votingData.targetUsername} завершено без участников`;
  } else if (yesCount > noCount) {
    
    const ratio = yesCount / (yesCount + noCount);
    let reward = Math.max(VOTING_REWARDS.MIN_REWARD, Math.floor(totalVotes));
    
    
    if (ratio >= VOTING_REWARDS.BONUS_THRESHOLD_HIGH) {
      reward += VOTING_REWARDS.HIGH_BONUS;
    } else if (ratio >= VOTING_REWARDS.BONUS_THRESHOLD_MID) {
      reward += VOTING_REWARDS.MID_BONUS;
    }
    
    reward = Math.min(VOTING_REWARDS.MAX_REWARD, reward);
    
    updateReceivedPoints(votingData.targetUserId, votingData.targetUsername, reward);
    
    
    miningMldReward(votingData.targetUserId, votingData.targetUsername, "voting_win");
    
    finalText = `🗳️ Голосование завершено!\n\n@${votingData.targetUsername} считает себя молодцом!\n\n🎉 Результат: ✅ ${yesCount} vs ❌ ${noCount}\n✨ Сообщество подтвердило - @${votingData.targetUsername} действительно заслуживает молодца! +${reward} молодцов`;
    separateMessage = `🎉 @${votingData.targetUsername} получает +${reward} молодцов! Поздравляем! 🎊`;
  } else if (noCount > yesCount) {
    
    finalText = `🗳️ Голосование завершено!\n\n@${votingData.targetUsername} считает себя молодцом!\n\n😔 Результат: ❌ ${noCount} vs ✅ ${yesCount}\nСообщество не согласно с самооценкой`;
    separateMessage = `📝 Голосование за @${votingData.targetUsername} завершено - сообщество не поддержало самооценку`;
  } else {
    
    finalText = `🗳️ Голосование завершено!\n\n@${votingData.targetUsername} считает себя молодцом!\n\n🤝 Результат: ничья ${yesCount}:${noCount}\nСпорный случай!`;
    separateMessage = `🤔 Голосование за @${votingData.targetUsername} завершилось ничьей - спорный случай!`;
  }
  
  
  try {
    editMessageText(chatId, messageId, finalText);
  } catch (error) {
    Logger.log(`Ошибка при редактировании сообщения голосования ${messageId}: ${error.message}`);
  }
  
  
  try {
    sendMessage(chatId, separateMessage, messageId);
  } catch (error) {
    Logger.log(`Ошибка при отправке сообщения о завершении голосования: ${error.message}`);
    
    try {
      sendMessage(chatId, separateMessage);
    } catch (secondError) {
      Logger.log(`Вторая попытка отправки тоже неудачна: ${secondError.message}`);
    }
  }
  
  
  PropertiesService.getScriptProperties().deleteProperty(votingKey);
}


function answerCallbackQuery(callbackQueryId, text) {
  const payload = {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: false
  };
  
  try {
    UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
      }
    );
  } catch (error) {
    Logger.log(`Ошибка ответа на callback: ${error.message}`);
  }
}


function editMessageTextWithKeyboard(chatId, messageId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: "HTML"
  };
  
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  
  try {
    UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`,
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
  } catch (error) {
    Logger.log(`Ошибка редактирования сообщения: ${error.message}`);
  }
}


function finalizeVotingByTrigger(e) {
  try {
    
    const triggerId = e.triggerUid;
    
    
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    
    let votingMessageId = null;
    let chatId = null;
    
    
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('trigger_') && allProperties[key] === triggerId) {
        votingMessageId = key.replace('trigger_', '');
        
        
        const votingKey = `voting_${votingMessageId}`;
        const votingDataStr = properties.getProperty(votingKey);
        if (votingDataStr) {
          const votingData = JSON.parse(votingDataStr);
          chatId = votingData.chatId;
        }
      }
    });
    
    if (votingMessageId && chatId) {
      Logger.log(`Автозавершение голосования через триггер: ${votingMessageId}`);
      finalizeVoting(chatId, parseInt(votingMessageId));
    } else {
      Logger.log(`Не удалось найти голосование для триггера: ${triggerId}`);
    }
    
  } catch (error) {
    Logger.log(`Ошибка в finalizeVotingByTrigger: ${error.message}`);
  }
}


const LAST_ITEMS_PROPERTY = "LAST_MLD_SHOP_ITEMS"; 



function clearLastMldShopItems() {
  try {
    PropertiesService.getScriptProperties().setProperty(LAST_ITEMS_PROPERTY, '[]');
    console.log('🧹 LAST_MLD_SHOP_ITEMS очищено ([])');
    sendTelegramMessage(ADMIN_CHAT_ID, '🧹 LAST_MLD_SHOP_ITEMS очищено ([])');
  } catch (e) {
    console.error(`❌ Ошибка clearLastMldShopItems: ${e.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка clearLastMldShopItems: ${e.message}`);
  }
}


function checkNewMldShopItems() {
  try {
    console.log("🔍 Начинаем проверку новых товаров в MLD магазине...");
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
    
    if (!shopSheet) {
      console.log("❌ Лист MLD_Shop не найден");
      sendTelegramMessage(ADMIN_CHAT_ID, "❌ Ошибка: лист MLD_Shop не найден");
      return;
    }
    
    
    const currentItems = getCurrentShopItems(shopSheet);
    console.log(`📦 Найдено товаров в магазине: ${currentItems.length}`);
    
    
    const lastItemsJson = PropertiesService.getScriptProperties().getProperty(LAST_ITEMS_PROPERTY);
    const lastItems = lastItemsJson ? JSON.parse(lastItemsJson) : [];
    console.log(`💾 Сохраненных товаров: ${lastItems.length}`);
    
    
    const newItems = findNewItems(currentItems, lastItems);
    
    if (newItems.length > 0) {
      console.log(`🆕 Найдено новых товаров: ${newItems.length}`);
      sendNewItemsNotification(newItems);
    } else {
      console.log("✅ Новых товаров не найдено");
      sendTelegramMessage(ADMIN_CHAT_ID, "✅ Проверка завершена: новых товаров в MLD магазине не найдено");
    }
    
    
    PropertiesService.getScriptProperties().setProperty(
      LAST_ITEMS_PROPERTY, 
      JSON.stringify(currentItems)
    );
    
    console.log("🏁 Проверка завершена успешно");
    
  } catch (error) {
    console.error(`❌ Ошибка при проверке товаров: ${error.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка проверки MLD магазина: ${error.message}`);
  }
}


function getCurrentShopItems(shopSheet) {
  const data = shopSheet.getDataRange().getValues();
  const items = [];
  
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    
    if (row[0] && row[1]) {
      items.push({
        id: String(row[0]).trim(),
        name: String(row[1]).trim(),
        description: String(row[2] || "").trim(),
        price: parseFloat(row[3]) || 0,
        available: parseInt(row[4]) || 0,
        category: String(row[5] || "").trim(),
        rowIndex: i + 1 
      });
    }
  }
  
  return items;
}


function findNewItems(currentItems, lastItems) {
  const lastItemIds = new Set(lastItems.map(item => item.id));
  
  return currentItems.filter(item => {
    
    return !lastItemIds.has(item.id);
  });
}


function sendNewItemsNotification(newItems) {
  let message = `🛒 <b>Новые товары в MLD магазине!</b>\n\n`;
  
  newItems.forEach((item, index) => {
    message += `${index + 1}. 💎 <b>${item.name}</b> <code>${item.id}</code>\n`;
    message += `   💰 Цена: <b>${item.price} MLD</b>\n`;
    
    if (item.description) {
      message += `   📝 ${item.description}\n`;
    }
    
    message += `   📦 Доступно: <b>${item.available} шт.</b>\n`;
    
    if (item.category) {
      const categoryEmoji = getCategoryEmoji(item.category);
      message += `   🏷️ Категория: ${categoryEmoji} ${item.category}\n`;
    }
    
    message += `\n`;
  });
  
  message += `🛍️ Для покупки используйте: <code>/buy_item ID_товара</code>\n`;
  message += `📋 Полный каталог: <code>/mld_shop</code>`;
  
  sendTelegramMessage(ADMIN_CHAT_ID, message);
}


function getCategoryEmoji(category) {
  const categoryEmojis = {
    'premium': '⭐',
    'merch': '🎁',
    'special': '✨',
    'limited': '🔥',
    'digital': '💻',
    'physical': '📦'
  };
  
  return categoryEmojis[category.toLowerCase()] || '🏷️';
}


function sendTelegramMessage(chatId, text) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };
  
  try {
    const response = UrlFetchApp.fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { 
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
      }
    );
    
    const result = JSON.parse(response.getContentText());
    
    if (result.ok) {
      console.log("✅ Сообщение отправлено успешно");
    } else {
      console.error(`❌ Ошибка отправки сообщения: ${result.description}`);
    }
    
    return result;
  } catch (err) {
    console.error(`❌ Ошибка при отправке в Telegram: ${err.message}`);
    return null;
  }
}


function initializeMldShopChecker() {
  try {
    console.log("🔧 Инициализация системы проверки MLD магазина...");
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
    
    if (!shopSheet) {
      console.log("❌ Лист MLD_Shop не найден");
      return;
    }
    
    const currentItems = getCurrentShopItems(shopSheet);
    
    PropertiesService.getScriptProperties().setProperty(
      LAST_ITEMS_PROPERTY, 
      JSON.stringify(currentItems)
    );
    
    console.log(`✅ Инициализация завершена. Сохранено товаров: ${currentItems.length}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `✅ Система проверки MLD магазина инициализирована. Отслеживается товаров: ${currentItems.length}`);
    
  } catch (error) {
    console.error(`❌ Ошибка инициализации: ${error.message}`);
  }
}


function resetMldShopChecker() {
  try {
    PropertiesService.getScriptProperties().deleteProperty(LAST_ITEMS_PROPERTY);
    console.log("🔄 Состояние системы проверки MLD магазина сброшено");
    sendTelegramMessage(ADMIN_CHAT_ID, "🔄 Система проверки MLD магазина сброшена. Запустите инициализацию заново.");
  } catch (error) {
    console.error(`❌ Ошибка сброса: ${error.message}`);
  }
}


function getMldShopStats() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
    
    if (!shopSheet) {
      sendTelegramMessage(ADMIN_CHAT_ID, "❌ Лист MLD_Shop не найден");
      return;
    }
    
    const items = getCurrentShopItems(shopSheet);
    const totalItems = items.length;
    const availableItems = items.filter(item => item.available > 0).length;
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.available), 0);
    
    
    const categories = {};
    items.forEach(item => {
      const cat = item.category || 'uncategorized';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;
    });
    
    let message = `📊 <b>Статистика MLD магазина</b>\n\n`;
    message += `📦 Всего товаров: <b>${totalItems}</b>\n`;
    message += `✅ В наличии: <b>${availableItems}</b>\n`;
    message += `💰 Общая стоимость: <b>${totalValue.toFixed(2)} MLD</b>\n\n`;
    
    message += `🏷️ <b>По категориям:</b>\n`;
    Object.entries(categories).forEach(([category, count]) => {
      const emoji = getCategoryEmoji(category);
      message += `${emoji} ${category}: ${count} товаров\n`;
    });
    
    sendTelegramMessage(ADMIN_CHAT_ID, message);
    
  } catch (error) {
    console.error(`❌ Ошибка получения статистики: ${error.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка получения статистики: ${error.message}`);
  }
}


function viewLastMldShopItems(limit = 0) {
  try {
    const json = PropertiesService.getScriptProperties().getProperty(LAST_ITEMS_PROPERTY);
    const items = json ? JSON.parse(json) : [];

    console.log(`💾 LAST_MLD_SHOP_ITEMS: ${items.length} шт.`);
    if (items.length) {
      console.log(items);
    }

    if (limit && limit > 0) {
      const preview = items.slice(0, limit);
      let msg = `🗂️ <b>Сохранённые товары</b> (показано ${preview.length} из ${items.length})\n\n`;
      preview.forEach((it, idx) => {
        msg += `${idx + 1}. 💎 <b>${it.name}</b> <code>${it.id}</code> — ${it.price} MLD, 📦 ${it.available}, 🏷️ ${it.category || '-'}\n`;
      });
      if (items.length > preview.length) {
        msg += `\n…и ещё ${items.length - preview.length}`;
      }
      sendTelegramMessage(ADMIN_CHAT_ID, msg);
    }

    return items;
  } catch (e) {
    console.error(`❌ Ошибка чтения LAST_MLD_SHOP_ITEMS: ${e.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка чтения LAST_MLD_SHOP_ITEMS: ${e.message}`);
    return [];
  }
}


function syncLastMldShopItemsFromSheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const shopSheet = spreadsheet.getSheetByName(MLD_SHOP_SHEET);
    if (!shopSheet) throw new Error('Лист магазина не найден');

    const currentItems = getCurrentShopItems(shopSheet);
    PropertiesService.getScriptProperties().setProperty(
      LAST_ITEMS_PROPERTY,
      JSON.stringify(currentItems)
    );

    console.log(`✅ LAST_MLD_SHOP_ITEMS обновлены из листа: ${currentItems.length} шт.`);
    sendTelegramMessage(ADMIN_CHAT_ID, `✅ LAST_MLD_SHOP_ITEMS обновлены из листа: <b>${currentItems.length}</b> шт.`);
  } catch (e) {
    console.error(`❌ Ошибка syncLastMldShopItemsFromSheet: ${e.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка syncLastMldShopItemsFromSheet: ${e.message}`);
  }
}


function setLastMldShopItemsFromJson(jsonString) {
  try {
    if (!jsonString || typeof jsonString !== 'string') throw new Error('Передайте JSON-строку');
    const items = JSON.parse(jsonString);
    if (!Array.isArray(items)) throw new Error('JSON должен быть массивом');

    
    items.forEach((it, i) => {
      if (!it || typeof it !== 'object') throw new Error(`Элемент #${i} не объект`);
      if (!it.id) throw new Error(`Элемент #${i} без id`);
    });

    PropertiesService.getScriptProperties().setProperty(
      LAST_ITEMS_PROPERTY,
      JSON.stringify(items)
    );

    console.log(`✅ LAST_MLD_SHOP_ITEMS перезаписаны: ${items.length} шт.`);
    sendTelegramMessage(ADMIN_CHAT_ID, `✅ LAST_MLD_SHOP_ITEMS перезаписаны: <b>${items.length}</b> шт.`);
    return true;
  } catch (e) {
    console.error(`❌ Ошибка setLastMldShopItemsFromJson: ${e.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка setLastMldShopItemsFromJson: ${e.message}`);
    return false;
  }
}


function patchLastMldShopItem(itemId, patchJson) {
  try {
    if (!itemId) throw new Error('itemId обязателен');
    if (!patchJson) throw new Error('patchJson обязателен');

    const json = PropertiesService.getScriptProperties().getProperty(LAST_ITEMS_PROPERTY);
    const items = json ? JSON.parse(json) : [];
    if (!items.length) throw new Error('Нет сохранённых товаров');

    const patch = typeof patchJson === 'string' ? JSON.parse(patchJson) : patchJson;
    const idx = items.findIndex(it => String(it.id).toLowerCase() === String(itemId).toLowerCase());
    if (idx === -1) throw new Error('Товар с таким ID не найден в сохранённых');

    const allowed = ['name', 'description', 'price', 'available', 'category'];
    Object.keys(patch).forEach(k => {
      if (!allowed.includes(k)) return;
      items[idx][k] = patch[k];
    });

    PropertiesService.getScriptProperties().setProperty(
      LAST_ITEMS_PROPERTY,
      JSON.stringify(items)
    );

    console.log(`✏️ Обновлён товар ${itemId}:`, items[idx]);
    sendTelegramMessage(ADMIN_CHAT_ID, `✏️ Обновлён товар <code>${itemId}</code> в памяти.`);
    return items[idx];
  } catch (e) {
    console.error(`❌ Ошибка patchLastMldShopItem: ${e.message}`);
    sendTelegramMessage(ADMIN_CHAT_ID, `❌ Ошибка patchLastMldShopItem: ${e.message}`);
    return null;
  }
}




function getMilestoneCounters(userId) {
  const props = PropertiesService.getScriptProperties();
  const given = parseInt(props.getProperty(`award_given_count_${userId}`) || '0', 10);
  const neuro = parseInt(props.getProperty(`neuro_count_${userId}`) || '0', 10);
  return {
    userId,
    givenCount: given,
    neuroCount: neuro,
    nextGivenIn: (20 - (given % 20)) % 20,
    nextNeuroIn: (15 - (neuro % 15)) % 15
  };
}


function viewUserMilestones(userId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let username = String(userId);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) { username = data[i][1]; break; }
    }
    const c = getMilestoneCounters(userId);
    const txt = `📊 MLD-милстоуны @${username}\n• Выдано (счётчик): ${c.givenCount} (до награды: ${c.nextGivenIn || 20})\n• Нейро-начисления: ${c.neuroCount} (до награды: ${c.nextNeuroIn || 15})`;
    sendMessage(ADMIN_CHAT_ID, txt);
    return c;
  } catch (e) {
    Logger.log('viewUserMilestones error: ' + e);
  }
}


function exportMilestoneCountersToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MLD_Milestone_Counters');
  if (!sheet) sheet = ss.insertSheet('MLD_Milestone_Counters');
  else sheet.clear();

  const base = ss.getSheetByName(SHEET_NAME);
  const data = base.getDataRange().getValues();
  const rows = [['USER_ID', 'USERNAME', 'GIVEN_COUNT', 'NEURO_COUNT', 'NEXT_GIVEN_LEFT', 'NEXT_NEURO_LEFT', 'LAST_ACTIVITY']];
  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const username = data[i][1];
    const last = (data[i][4] || '').toString();
    if (!userId || !username) continue;
    const c = getMilestoneCounters(userId);
    rows.push([userId, username, c.givenCount, c.neuroCount, c.nextGivenIn || 20, c.nextNeuroIn || 15, last]);
  }
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
}


function viewMilestonesSummary(limit = 10) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const base = ss.getSheetByName(SHEET_NAME);
  const data = base.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const userId = data[i][0];
    const username = data[i][1];
    if (!userId || !username) continue;
    const c = getMilestoneCounters(userId);
    const progGiven = c.givenCount % 20;
    const progNeuro = c.neuroCount % 15;
    list.push({ username, progGiven, leftGiven: c.nextGivenIn || 20, progNeuro, leftNeuro: c.nextNeuroIn || 15 });
  }
  list.sort((a,b) => (b.progGiven + b.progNeuro) - (a.progGiven + a.progNeuro));
  const top = list.slice(0, Math.max(1, Math.min(limit, list.length)));
  let msg = '📈 Прогресс к наградам MLD (топ):\n';
  top.forEach((u, i) => {
    msg += `${i+1}. @${u.username} — выданные: ${u.progGiven}/20 (осталось ${u.leftGiven}), нейро: ${u.progNeuro}/15 (осталось ${u.leftNeuro})\n`;
  });
  sendMessage(ADMIN_CHAT_ID, msg);
}



function safeMintMld(userId, username, amount, reason) {
  if (amount <= 0) return 0;
  const properties = PropertiesService.getScriptProperties();
  const totalSupply = parseFloat(properties.getProperty("MLD_TOTAL_SUPPLY") || "0");
  const available = Math.max(0, MLD_CONFIG.MAX_SUPPLY - totalSupply);
  const mint = Math.min(available, amount);
  if (mint <= 0) return 0;
  properties.setProperty("MLD_TOTAL_SUPPLY", (totalSupply + mint).toString());
  updateUserMldBalance(userId, username, mint, reason || "mining", 0);
  return mint;
}


function weeklyAirdropDistribute() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return sendMessage(ADMIN_CHAT_ID, "❌ Нет пользователей для airdrop");

    
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const headers = data[0];
    const hasLast = headers && headers.length >= 5 && headers[4] === "LAST_ACTIVITY";

    const candidates = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const userId = row[0];
      const username = row[1];
      const received = parseInt(row[2], 10) || 0;
      const given = parseInt(row[3], 10) || 0;
      
      let activeRecent = true;
      if (hasLast && row[4]) {
        const last = new Date(row[4]);
        activeRecent = last >= weekAgo;
      }
      
      const eligible = activeRecent && (received >= 5 || given >= 5);
      if (eligible && userId && username) {
        candidates.push({ id: userId, username });
      }
    }

    if (candidates.length === 0) {
      return sendMessage(ADMIN_CHAT_ID, "✅ Airdrop: нет подходящих активных участников на этой неделе");
    }

    
    const POOL = 5.0;
    const MIN_PER_USER = 0.1;
    
    const winnersCount = Math.max(1, Math.min(candidates.length, Math.floor(5 + Math.random() * 6))); 
    shuffleArray(candidates);
    const winners = candidates.slice(0, winnersCount);

    
    const weights = [];
    for (let i = 0; i < winners.length; i++) {
      weights.push(Math.random() + 0.1); 
    }
    const sumWeights = weights.reduce((a, b) => a + b, 0);

    
    let remaining = POOL - winners.length * MIN_PER_USER;
    if (remaining < 0) remaining = 0;

    const payouts = winners.map((w, idx) => MIN_PER_USER + (remaining * (weights[idx] / sumWeights)));

    
    let total = payouts.reduce((a, b) => a + b, 0);
    const scale = POOL / total;
    for (let i = 0; i < payouts.length; i++) payouts[i] = Math.max(MIN_PER_USER, Math.round(payouts[i] * scale * 10000) / 10000);

    
    let msg = `🎁 Еженедельный AIRDROP MLD! Пул ${POOL} MLD:\n`;
    let actuallyDistributed = 0;
    for (let i = 0; i < winners.length; i++) {
      const { id, username } = winners[i];
      const minted = safeMintMld(id, username, payouts[i], "airdrop");
      if (minted > 0) {
        actuallyDistributed += minted;
        msg += `• @${username}: +${minted} MLD\n`;
      }
    }
    msg += `\nИтого распределено: ${Math.round(actuallyDistributed * 10000) / 10000} MLD`;
    sendMessage(ADMIN_CHAT_ID, msg);
  } catch (e) {
    Logger.log("Ошибка weeklyAirdropDistribute: " + e);
    sendMessage(ADMIN_CHAT_ID, `❌ Ошибка AIRDROP: ${e}`);
  }
}


function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}


function checkGivenMilestoneAndAwardMld(userId, username) {
  const props = PropertiesService.getScriptProperties();
  const key = `award_given_count_${userId}`;
  const cur = parseInt(props.getProperty(key) || "0", 10) + 1; 
  props.setProperty(key, String(cur));
  if (cur % 20 === 0) {
    const minted = safeMintMld(userId, username, 0.5, "milestone_given");
    if (minted > 0) sendMessage(ADMIN_CHAT_ID, `🎉 @${username} получает ${minted} MLD за каждые 20 выданных молодцов!`);
  }
}


function incNeuroCountAndAward(userId, username) {
  const props = PropertiesService.getScriptProperties();
  const key = `neuro_count_${userId}`;
  const cur = parseInt(props.getProperty(key) || "0", 10) + 1;
  props.setProperty(key, String(cur));
  if (cur % 15 === 0) {
    const minted = safeMintMld(userId, username, 0.5, "neuro_reward");
    if (minted > 0) sendMessage(ADMIN_CHAT_ID, `🤖 @${username} получает ${minted} MLD за 15 полученных нейромолодцов!`);
  }
}


function setupWeeklyAirdropTrigger() {
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => { if (t.getHandlerFunction() === 'weeklyAirdropDistribute') ScriptApp.deleteTrigger(t); });
  
  ScriptApp.newTrigger('weeklyAirdropDistribute')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(10)
    .create();
  sendMessage(ADMIN_CHAT_ID, '✅ Триггер еженедельного AIRDROP установлен (понедельник 10:00)');
}

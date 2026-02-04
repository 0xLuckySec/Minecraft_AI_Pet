const mineflayer = require('mineflayer');
const axios = require('axios');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalFollow = goals.GoalFollow;
const collectBlock = require('mineflayer-collectblock').plugin;
// --- AYARLAR ---
const GROQ_API_KEY = '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'; 
const MC_PORT = 25565; // Minecraft LAN portun!

const bot = mineflayer.createBot({
  host: '127.0.0.1',
  port: MC_PORT,
  username: 'Groq_Bot',
  auth: 'offline'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock);
console.log("🚀 Groq Bot hazırlanır...");

bot.on('spawn', () => {
  console.log("✅ Bot oyuna girdi! (Groq AI aktivdir)");
});

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  console.log(`📩 [${username}]: ${message}`);

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
  { 
    role: 'system', 
    content: `Sən Minecraft oyunçusu LuckyYmer-in ən yaxın dostusan. 
          Robot kimi yox, bir oyunçu kimi danış. 
          - Cavabların qısa və konkret olsun (maksimum 10-15 söz).
          - "Mən robotam", "köməkçiyəm" kimi rəsmi cümlələr qurma.
          - Minecraft jarqonundan istifadə et (məsələn: "it kimi acmışam", "gecə olur, qaçaq", "stək-stək odun yığdım").
          - LuckyYmer sənə "salam" verəndə, "Salam, nə edirik? Mağaraya düşək?" kimi maraqlı suallar ver.
          - Hərdən emojilər istifadə et ( :D , :) , <3 ).` 
  },
  { role: 'user', content: message }
]
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.choices[0].message.content;
    bot.chat(reply.substring(0, 256)); 
    console.log(`🤖 Bot: ${reply}`);

  } catch (err) {
    if (err.response) {
      console.error(`❌ Groq Xətası: ${err.response.status}`);
      console.error(err.response.data);
    } else {
      console.error(`❌ Bağlantı xətası: ${err.message}`);
    }
    bot.chat("Beynim qızışdı, bir az gözlə...");
  }
});
bot.on('chat', async (username, message) => {
  const msg = message.toLowerCase();

  // --- DAYANMAQ ---
  if (msg === 'dayan') {
    bot.pathfinder.setGoal(null);
    return bot.chat("Oldu, dayandım.");
  }

  // --- AĞAC QAZMAQ ---
 // --- AĞAC QAZMAQ (Plugin-siz, Xətasız Variant) ---
  if (msg === 'agac qaz') {
    // 1. Ətrafda 32 blok radiusda odun axtar
    const tree = bot.findBlock({
      matching: (block) => block.name.includes('log'),
      maxDistance: 32
    });

    if (!tree) {
      return bot.chat("Yaxınlıqda ağac görmürəm. :( ");
    }

    bot.chat("Ağacı tapdım, yanına gedirəm!");

    // 2. Yol tap və ağacın yanına get
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    
    // Ağacın düz yanına (1 blok məsafəyə) hədəf qoyuruq
    bot.pathfinder.setGoal(new goals.GoalGetToBlock(tree.position.x, tree.position.y, tree.position.z));

    // 3. Yanına çatanda (goal_reached) qazmağa başla
    bot.once('goal_reached', async () => {
      try {
        // Botun ağaca baxmasını təmin edək
        await bot.lookAt(tree.position);
        
        // Qazmağa başla
        bot.chat("Qazıram...");
        await bot.dig(tree);
        
        bot.chat("Odunu götürdüm! Başqa nə qazım?");
        
        // Yerdə qalan odun parçasını götürmək üçün kiçik hərəkət
        bot.pathfinder.setGoal(new goals.GoalFollow(bot.players[username].entity, 1));
        
      } catch (err) {
        bot.chat("Qazanda problem oldu, bəlkə nəsə mane olur?");
        console.log(err);
      }
    });
    return;
  }

  // --- SANDIĞA QOYMAQ ---
  if (msg === 'sandiga qoy') {
    const chestBlock = bot.findBlock({
      matching: (block) => block.name === 'chest',
      maxDistance: 6
    });

    if (!chestBlock) return bot.chat("Yaxınlıqda sandıq yoxdur!");

    bot.chat("Sandığı doldururam...");
    const chest = await bot.openChest(chestBlock);
    for (const item of bot.inventory.items()) {
      try {
        await chest.deposit(item.type, null, item.count);
      } catch (e) {
        console.log(`Bəzi əşyalar qoyulmadı: ${item.name}`);
      }
    }
    setTimeout(() => chest.close(), 500);
    return;
  }  
  if (message === 'gəl bura') {
    const target = bot.players[username]?.entity;
    if (!target) return bot.chat("Səni görmürəm!");

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new GoalFollow(target, 2), true);
    bot.chat("Gəldim!");
  }
});
bot.on('error', (err) => console.log('🔴 Xəta:', err));
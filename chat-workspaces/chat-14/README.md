
# 🛒 Telegram Bot — Магазин аккаунтов (клон @zipppppppppaaaabot)

Полная копия бота-магазина аккаунтов с:
- 🛒 **Mini App каталогом** (веб-каталог внутри Telegram)
- 💰 **Продажей аккаунтов** (многошаговая форма: категория → название → описание → цена)
- 📋 **Моими объявлениями** (просмотр и удаление)
- 📦 **Моими покупками**
- 🔗 **Реферальной программой** (10% с покупок приглашённых)
- 💸 **Балансом и выводом** (100% продавцу, 0% комиссия)
- 🗄️ **SQLite базой данных**

## Установка

### 1. Установите Python 3.10+
Скачать: https://python.org (при установке отметьте "Add Python to PATH")

### 2. Создайте бота в @BotFather
- Откройте [@BotFather](https://t.me/BotFather)
- Отправьте `/newbot`
- Задайте имя и username
- Скопируйте токен

### 3. Настройте .env
```bash
cp .env.example .env
```
Отредактируйте `.env`:
```
BOT_TOKEN=ваш_токен_от_BotFather
WEBAPP_PORT=8080
WEBAPP_URL=https://ваш-ngrok-url.ngrok-free.app
ADMIN_ID=ваш_telegram_id
```

### 4. Установите зависимости
```bash
pip install -r requirements.txt
```

### 5. Запустите бота
```bash
python main.py
```

## Настройка Mini App (каталога магазина)

Чтобы кнопка «🛒 Открыть магазин» открывала каталог внутри Telegram:

### Шаг 1 — Туннель (ngrok)
Так как Telegram требует HTTPS URL для Mini App, нужен туннель:

**Вариант A — ngrok:**
```bash
# Скачайте ngrok: https://ngrok.com
ngrok http 8080
```
Скопируйте URL (например `https://xxxx.ngrok-free.app`).

**Вариант B — cloudflared:**
```bash
cloudflared tunnel --url http://localhost:8080
```

**Вариант C — serveo:**
```bash
ssh -R 80:localhost:8080 serveo.net
```

### Шаг 2 — Впишите URL в .env
```
WEBAPP_URL=https://xxxx.ngrok-free.app
```

### Шаг 3 — Задайте Menu Button в BotFather
1. Откройте @BotFather
2. `/mybots` → выберите вашего бота
3. `Bot Settings` → `Menu Button` → `Configure menu button`
4. Отправьте URL: `https://xxxx.ngrok-free.app`

### Шаг 4 — Перезапустите бота
```bash
python main.py
```

## Структура проекта

```
.
├── main.py            # Основной файл бота (все хендлеры, запуск)
├── database.py        # Работа с SQLite (пользователи, объявления, покупки)
├── requirements.txt   # Зависимости
├── .env.example       # Шаблон конфигурации
├── .env               # Ваша конфигурация (не коммитить!)
├── shop.db            # SQLite база (создаётся автоматически)
└── webapp/
    └── index.html     # Mini App — каталог магазина
```

## Команды

| Команда  | Описание                          |
|----------|-----------------------------------|
| `/start` | Главное меню                      |
| `/admin` | Просмотр заявок на вывод (admin)  |

## Категории продаж

- 🎮 Steam-аккаунты
- ✈️ Telegram-аккаунты
- 📈 Накрутка Telegram
- 🔵 Накрутка VK
- ▶️ Накрутка YouTube
- 🎵 Накрутка TikTok
- 📸 Накрутка Instagram

## Быстрый старт (без Mini App)

Бот полностью работает и без настройки Mini App (нужен только токен).
Кнопка «🛒 Открыть магазин» покажет инструкцию по подключению.
Все остальные функции (продажа, покупки, рефералы, баланс) работают сразу.

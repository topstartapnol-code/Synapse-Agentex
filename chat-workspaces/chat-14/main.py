
import os
import logging

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from dotenv import load_dotenv
from aiohttp import web

import database as db

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(name)s — %(levelname)s — %(message)s")
log = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_PORT = int(os.getenv("WEBAPP_PORT", "8080"))
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip()
ADMIN_ID = int(os.getenv("ADMIN_ID", "0") or "0")

CATEGORIES = [
    ("steam", "Steam-аккаунты", "🎮 Steam"),
    ("telegram", "Telegram-аккаунты", "✈️ Telegram"),
    ("nakrut_tg", "Накрутка Telegram", "📈 Накрутка TG"),
    ("nakrut_vk", "Накрутка VK", "🔵 Накрутка VK"),
    ("nakrut_yt", "Накрутка YouTube", "▶️ Накрутка YouTube"),
    ("nakrut_tt", "Накрутка TikTok", "🎵 Накрутка TikTok"),
    ("nakrut_ig", "Накрутка Instagram", "📸 Накрутка Instagram"),
]

CAT_LABELS = {c[0]: c[1] for c in CATEGORIES}
CAT_BADGES = {c[0]: c[2] for c in CATEGORIES}

sell_state: dict = {}


def is_webapp_available():
    return WEBAPP_URL.startswith("https://")


def main_menu_kb():
    kb = []
    if is_webapp_available():
        kb.append([InlineKeyboardButton("🛒 Открыть магазин", web_app=WebAppInfo(url=WEBAPP_URL))])
    else:
        kb.append([InlineKeyboardButton("🛒 Каталог магазина", callback_data="shop_catalog")])
    kb.append([InlineKeyboardButton("💰 Продать аккаунт", callback_data="sell")])
    kb.append([InlineKeyboardButton("📋 Мои объявления", callback_data="my_listings")])
    kb.append([InlineKeyboardButton("📦 Мои покупки", callback_data="my_purchases")])
    kb.append([InlineKeyboardButton("🔗 Реферальная программа", callback_data="referral")])
    kb.append([InlineKeyboardButton("💸 Мой баланс / Вывод", callback_data="balance")])
    return InlineKeyboardMarkup(kb)


def back_to_main_kb():
    return InlineKeyboardMarkup([[InlineKeyboardButton("← Главное меню", callback_data="main_menu")]])


def cancel_kb():
    return InlineKeyboardMarkup([[InlineKeyboardButton("← Отмена", callback_data="cancel_sell")]])


def sell_category_kb():
    kb = []
    for cat_key, cat_label, _ in CATEGORIES:
        kb.append([InlineKeyboardButton(cat_label, callback_data=f"sell_cat:{cat_key}")])
    kb.append([InlineKeyboardButton("← Главное меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(kb)


def my_listings_kb(user_id: int):
    listings = db.get_user_listings(user_id)
    kb = []
    for l in listings:
        status_emoji = "✅" if l["status"] == "active" else "💰" if l["status"] == "sold" else "🗑"
        kb.append([InlineKeyboardButton(f"{status_emoji} {l['title']} — {l['price']}⭐", callback_data=f"listing_info:{l['id']}")])
    kb.append([InlineKeyboardButton("← Главное меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(kb)


def listing_detail_kb(listing_id: int):
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🗑 Удалить объявление", callback_data=f"delete_listing:{listing_id}")],
        [InlineKeyboardButton("← Назад", callback_data="my_listings")],
    ])


def shop_category_kb():
    kb = []
    for cat_key, cat_label, cat_badge in CATEGORIES:
        kb.append([InlineKeyboardButton(f"{cat_badge} {cat_label}", callback_data=f"shop_cat:{cat_key}")])
    kb.append([InlineKeyboardButton("🌐 Все категории", callback_data="shop_cat:all")])
    kb.append([InlineKeyboardButton("← Главное меню", callback_data="main_menu")])
    return InlineKeyboardMarkup(kb)


def shop_listings_kb(listings, page=0, per_page=5):
    kb = []
    start = page * per_page
    end = start + per_page
    page_listings = listings[start:end]

    for l in page_listings:
        cat_badge = CAT_BADGES.get(l["category"], "")
        label = f"{cat_badge} {l['title'][:30]} — {l['price']}⭐"
        kb.append([InlineKeyboardButton(label, callback_data=f"buy_view:{l['id']}")])

    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton("⬅️ Назад", callback_data=f"shop_page:{page - 1}"))
    if end < len(listings):
        nav.append(InlineKeyboardButton("Вперёд ➡️", callback_data=f"shop_page:{page + 1}"))
    if nav:
        kb.append(nav)

    kb.append([InlineKeyboardButton("← К категориям", callback_data="shop_catalog")])
    return InlineKeyboardMarkup(kb)


def buy_view_kb(listing_id: int):
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💳 Купить", callback_data=f"buy_confirm:{listing_id}")],
        [InlineKeyboardButton("← Назад", callback_data="shop_back")],
    ])


# ═══════════════════════════════════════════════════════════════════
#  HANDLERS
# ═══════════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    ref_code = context.args[0] if context.args else None
    db.get_or_create_user(user.id, user.username, ref_code)

    text = (
        "👋 Привет! Это магазин аккаунтов.\n\n"
        "— Жми «🛒 Каталог магазина», чтобы посмотреть товары\n"
        "— Жми «💰 Продать аккаунт», чтобы выставить на продажу"
    )
    await update.message.reply_text(text, reply_markup=main_menu_kb())


async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    user_id = query.from_user.id

    db_user = db.get_user(user_id)
    if not db_user:
        db_user = db.get_or_create_user(user_id, query.from_user.username)

    # ── Главное меню ──
    if data == "main_menu":
        text = (
            "👋 Привет! Это магазин аккаунтов.\n\n"
            "— Жми «🛒 Каталог магазина», чтобы посмотреть товары\n"
            "— Жми «💰 Продать аккаунт», чтобы выставить на продажу"
        )
        await query.message.edit_text(text, reply_markup=main_menu_kb())

    # ── Каталог (inline, без Mini App) ──
    elif data == "shop_catalog":
        context.user_data["shop_page"] = 0
        context.user_data["shop_cat"] = None
        await query.message.edit_text("🛒 Выберите категорию:", reply_markup=shop_category_kb())

    elif data.startswith("shop_cat:"):
        cat_key = data.split(":", 1)[1]
        context.user_data["shop_cat"] = cat_key
        context.user_data["shop_page"] = 0

        all_listings = db.get_all_listings(active_only=True)
        if cat_key != "all":
            all_listings = [l for l in all_listings if l["category"] == cat_key]

        context.user_data["shop_listings"] = all_listings

        if not all_listings:
            await query.message.edit_text("😕 В этой категории пока нет объявлений.", reply_markup=shop_category_kb())
        else:
            cat_name = "Все категории" if cat_key == "all" else CAT_LABELS.get(cat_key, cat_key)
            text = f"🛒 {cat_name} ({len(all_listings)} объявл.)\n\nСтраница 1:"
            await query.message.edit_text(text, reply_markup=shop_listings_kb(all_listings, 0))

    elif data.startswith("shop_page:"):
        page = int(data.split(":", 1)[1])
        context.user_data["shop_page"] = page
        all_listings = context.user_data.get("shop_listings", db.get_all_listings(active_only=True))
        cat_key = context.user_data.get("shop_cat", "all")
        cat_name = "Все категории" if cat_key == "all" else CAT_LABELS.get(cat_key, cat_key)
        text = f"🛒 {cat_name} ({len(all_listings)} объявл.)\n\nСтраница {page + 1}:"
        await query.message.edit_text(text, reply_markup=shop_listings_kb(all_listings, page))

    elif data == "shop_back":
        page = context.user_data.get("shop_page", 0)
        all_listings = context.user_data.get("shop_listings", db.get_all_listings(active_only=True))
        cat_key = context.user_data.get("shop_cat", "all")
        cat_name = "Все категории" if cat_key == "all" else CAT_LABELS.get(cat_key, cat_key)
        text = f"🛒 {cat_name} ({len(all_listings)} объявл.)\n\nСтраница {page + 1}:"
        await query.message.edit_text(text, reply_markup=shop_listings_kb(all_listings, page))

    elif data.startswith("buy_view:"):
        listing_id = int(data.split(":", 1)[1])
        all_listings = db.get_all_listings(active_only=True)
        l = next((x for x in all_listings if x["id"] == listing_id), None)
        if not l:
            await query.message.edit_text("Объявление уже недоступно.", reply_markup=back_to_main_kb())
            return
        cat_label = CAT_LABELS.get(l["category"], l["category"])
        text = (
            f"📋 Объявление #{l['id']}\n\n"
            f"Категория: {cat_label}\n"
            f"Название: {l['title']}\n"
            f"Описание: {l['description']}\n"
            f"Цена: {l['price']} ⭐\n"
        )
        await query.message.edit_text(text, reply_markup=buy_view_kb(listing_id))

    elif data.startswith("buy_confirm:"):
        listing_id = int(data.split(":", 1)[1])
        result = db.buy_listing(listing_id, user_id)
        if result is None:
            await query.message.edit_text(
                "❌ Не удалось купить. Возможно, объявление уже продано или это ваше.",
                reply_markup=back_to_main_kb(),
            )
        else:
            text = (
                f"✅ Покупка совершена!\n\n"
                f"Товар: {result['title']}\n"
                f"Цена: {result['price']} ⭐\n\n"
                "Продавец получит уведомление."
            )
            await query.message.edit_text(text, reply_markup=back_to_main_kb())

    # ── Продать аккаунт ──
    elif data == "sell":
        sell_state.pop(user_id, None)
        await query.message.edit_text("Выберите категорию вашего аккаунта:", reply_markup=sell_category_kb())

    elif data.startswith("sell_cat:"):
        cat_key = data.split(":", 1)[1]
        sell_state[user_id] = {"step": "title", "category": cat_key}
        await query.message.edit_text("✏️ Напишите короткое название объявления:", reply_markup=cancel_kb())

    elif data == "cancel_sell":
        sell_state.pop(user_id, None)
        await query.message.edit_text("❌ Отменено. Возвращаю в главное меню.", reply_markup=main_menu_kb())

    # ── Мои объявления ──
    elif data == "my_listings":
        listings = db.get_user_listings(user_id)
        if not listings:
            await query.message.edit_text("У вас пока нет объявлений.\n\nНажмите «💰 Продать аккаунт» в главном меню.", reply_markup=back_to_main_kb())
        else:
            await query.message.edit_text("📋 Ваши объявления:\n\nВыберите для деталей:", reply_markup=my_listings_kb(user_id))

    elif data.startswith("listing_info:"):
        listing_id = int(data.split(":", 1)[1])
        listings = db.get_user_listings(user_id)
        l = next((x for x in listings if x["id"] == listing_id), None)
        if not l:
            await query.message.edit_text("Объявление не найдено.", reply_markup=back_to_main_kb())
            return
        status_text = {"active": "🟢 Активно", "sold": "💰 Продано", "deleted": "🗑 Удалено"}.get(l["status"], l["status"])
        text = (
            f"📋 Объявление #{l['id']}\n\n"
            f"Категория: {CAT_LABELS.get(l['category'], l['category'])}\n"
            f"Название: {l['title']}\n"
            f"Описание: {l['description']}\n"
            f"Цена: {l['price']} ⭐\n"
            f"Статус: {status_text}\n"
        )
        if l["status"] == "active":
            await query.message.edit_text(text, reply_markup=listing_detail_kb(listing_id))
        else:
            await query.message.edit_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← Назад", callback_data="my_listings")]]))

    elif data.startswith("delete_listing:"):
        listing_id = int(data.split(":", 1)[1])
        ok = db.delete_listing(listing_id, user_id)
        if ok:
            await query.message.edit_text("✅ Объявление удалено.", reply_markup=back_to_main_kb())
        else:
            await query.message.edit_text("❌ Не удалось удалить.", reply_markup=back_to_main_kb())

    # ── Мои покупки ──
    elif data == "my_purchases":
        purchases = db.get_user_purchases(user_id)
        if not purchases:
            await query.message.edit_text("У вас пока нет покупок.", reply_markup=back_to_main_kb())
        else:
            text = "📦 Ваши покупки:\n\n"
            for p in purchases:
                text += f"• {p['title']} ({CAT_LABELS.get(p['category'], p['category'])}) — {p['price']} ⭐\n"
            await query.message.edit_text(text, reply_markup=back_to_main_kb())

    # ── Рефералка ──
    elif data == "referral":
        ref_code = db_user["ref_code"]
        bot_username = (await context.bot.get_me()).username
        ref_link = f"https://t.me/{bot_username}?start={ref_code}"
        text = (
            "🔗 Реферальная программа\n\n"
            f"Ваша ссылка:\n{ref_link}\n\n"
            f"👥 Приглашено: {db_user['invited_count']}\n"
            f"💰 Всего заработано: {db_user['ref_earned']} ⭐\n"
            f"💳 Баланс (реферальные): {db_user['balance_ref']} ⭐\n\n"
            "Вы получаете 10% с каждой покупки приглашённого."
        )
        await query.message.edit_text(text, reply_markup=back_to_main_kb())

    # ── Баланс ──
    elif data == "balance":
        text = (
            "💰 Мой баланс\n\n"
            f"Баланс с продаж: {db_user['balance_sales']} ⭐\n"
            f"Баланс с рефералов: {db_user['balance_ref']} ⭐\n\n"
            "Условия:\n"
            "• Продавец получает 100% от цены\n"
            "• Реферал: 10% с каждой покупки приглашённого\n\n"
            "Для вывода средств свяжитесь с администрацией."
        )
        await query.message.edit_text(text, reply_markup=back_to_main_kb())


async def text_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text

    state = sell_state.get(user_id)
    if not state:
        await update.message.reply_text("Используйте кнопки меню для навигации.\n\n/start — главное меню", reply_markup=main_menu_kb())
        return

    if state["step"] == "title":
        if len(text) > 100:
            await update.message.reply_text("❌ Название слишком длинное (макс. 100 символов).", reply_markup=cancel_kb())
            return
        state["title"] = text
        state["step"] = "description"
        await update.message.reply_text("✏️ Теперь напишите подробное описание объявления:", reply_markup=cancel_kb())

    elif state["step"] == "description":
        if len(text) > 1000:
            await update.message.reply_text("❌ Описание слишком длинное (макс. 1000 символов).", reply_markup=cancel_kb())
            return
        state["description"] = text
        state["step"] = "price"
        await update.message.reply_text("💵 Укажите цену в Stars (например: 100):", reply_markup=cancel_kb())

    elif state["step"] == "price":
        try:
            price = int(text.strip())
            if price <= 0 or price > 1000000:
                raise ValueError
        except ValueError:
            await update.message.reply_text("❌ Некорректная цена. Введите число (например: 100):", reply_markup=cancel_kb())
            return

        listing_id = db.create_listing(
            seller_id=user_id,
            category=state["category"],
            title=state["title"],
            description=state["description"],
            price=price,
        )
        sell_state.pop(user_id, None)

        cat_label = CAT_LABELS.get(state["category"], state["category"])
        text_confirm = (
            f"✅ Объявление #{listing_id} создано!\n\n"
            f"Категория: {cat_label}\n"
            f"Название: {state['title']}\n"
            f"Цена: {price} ⭐\n\n"
            "Теперь оно появится в каталоге магазина."
        )
        await update.message.reply_text(text_confirm, reply_markup=main_menu_kb())


async def cmd_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if ADMIN_ID and update.effective_user.id != ADMIN_ID:
        return
    withdrawals = db.get_pending_withdrawals()
    if not withdrawals:
        await update.message.reply_text("Нет заявок на вывод.")
        return
    text = "Заявки на вывод:\n\n"
    for w in withdrawals:
        text += f"#{w['id']} — {w['amount']} ⭐ ({w['type']}) — user {w['user_id']}\n"
    await update.message.reply_text(text)


# ═══════════════════════════════════════════════════════════════════
#  WEB SERVER (для Mini App, если настроен HTTPS)
# ═══════════════════════════════════════════════════════════════════

async def web_index(request):
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "webapp", "index.html")
    return web.FileResponse(html_path)

async def web_api_listings(request):
    listings = db.get_all_listings(active_only=True)
    result = [{
        "id": l["id"],
        "category_key": l["category"],
        "category_label": CAT_BADGES.get(l["category"], l["category"]),
        "title": l["title"],
        "description": l["description"],
        "price": l["price"],
    } for l in listings]
    return web.json_response({"ok": True, "listings": result})

async def web_api_buy(request):
    try:
        data = await request.json()
        listing_id = int(data["listing_id"])
        buyer_id = int(data["user_id"])
    except Exception:
        return web.json_response({"ok": False, "error": "Некорректные данные"})
    result = db.buy_listing(listing_id, buyer_id)
    if result is None:
        return web.json_response({"ok": False, "error": "Объявление недоступно"})
    return web.json_response({"ok": True, "listing": {"title": result["title"], "price": result["price"]}})

async def start_web_server():
    app_web = web.Application()
    app_web.router.add_get("/", web_index)
    app_web.router.add_get("/api/listings", web_api_listings)
    app_web.router.add_post("/api/buy", web_api_buy)
    runner = web.AppRunner(app_web)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", WEBAPP_PORT)
    await site.start()
    log.info(f"🌐 Веб-сервер на порту {WEBAPP_PORT}")
    if is_webapp_available():
        log.info(f"📱 Mini App: {WEBAPP_URL}")
    else:
        log.info("📱 Mini App отключён. Каталог работает через кнопки в чате.")

async def post_init(application: Application):
    await start_web_server()


def main():
    if not BOT_TOKEN:
        print("❌ Не указан BOT_TOKEN в .env!")
        return

    db.init_db()
    log.info("📦 База данных инициализирована")

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("admin", cmd_admin))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_message_handler))

    log.info("🚀 Бот запускается...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()

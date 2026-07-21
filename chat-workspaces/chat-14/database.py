
import sqlite3
import os
import secrets
import string

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shop.db")


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = _connect()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id      INTEGER PRIMARY KEY,
            username     TEXT,
            ref_code     TEXT UNIQUE,
            referrer_id  INTEGER,
            balance_sales   INTEGER DEFAULT 0,
            balance_ref     INTEGER DEFAULT 0,
            invited_count   INTEGER DEFAULT 0,
            ref_earned      INTEGER DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS listings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id    INTEGER NOT NULL,
            category     TEXT NOT NULL,
            title        TEXT NOT NULL,
            description  TEXT NOT NULL,
            price        INTEGER NOT NULL,
            status       TEXT DEFAULT 'active',
            buyer_id     INTEGER,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS purchases (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            listing_id   INTEGER NOT NULL,
            buyer_id     INTEGER NOT NULL,
            seller_id    INTEGER NOT NULL,
            price        INTEGER NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS withdrawals (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            amount       INTEGER NOT NULL,
            type         TEXT NOT NULL,
            status       TEXT DEFAULT 'pending',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    conn.close()


def _gen_ref_code():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


def get_or_create_user(user_id: int, username: str = None, ref_code: str = None):
    conn = _connect()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    row = cur.fetchone()

    if row is None:
        code = _gen_ref_code()
        # уникальность
        while cur.execute("SELECT 1 FROM users WHERE ref_code = ?", (code,)).fetchone():
            code = _gen_ref_code()

        referrer_id = None
        if ref_code:
            r = cur.execute(
                "SELECT user_id FROM users WHERE ref_code = ?", (ref_code,)
            ).fetchone()
            if r and r["user_id"] != user_id:
                referrer_id = r["user_id"]

        cur.execute(
            "INSERT INTO users (user_id, username, ref_code, referrer_id) VALUES (?, ?, ?, ?)",
            (user_id, username, code, referrer_id),
        )
        if referrer_id:
            cur.execute(
                "UPDATE users SET invited_count = invited_count + 1 WHERE user_id = ?",
                (referrer_id,),
            )
        conn.commit()

        cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cur.fetchone()

    conn.close()
    return dict(row) if row else None


def get_user(user_id: int):
    conn = _connect()
    cur = conn.cursor()
    row = cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_listings(user_id: int):
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user_purchases(user_id: int):
    conn = _connect()
    rows = conn.execute(
        """SELECT p.*, l.title, l.category FROM purchases p
           JOIN listings l ON p.listing_id = l.id
           WHERE p.buyer_id = ? ORDER BY p.created_at DESC""",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_listings(active_only: bool = True):
    conn = _connect()
    if active_only:
        rows = conn.execute(
            "SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC"
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM listings ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_listing(seller_id: int, category: str, title: str, description: str, price: int):
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO listings (seller_id, category, title, description, price) VALUES (?, ?, ?, ?, ?)",
        (seller_id, category, title, description, price),
    )
    listing_id = cur.lastrowid
    conn.commit()
    conn.close()
    return listing_id


def buy_listing(listing_id: int, buyer_id: int):
    conn = _connect()
    cur = conn.cursor()
    row = cur.execute("SELECT * FROM listings WHERE id = ? AND status = 'active'", (listing_id,)).fetchone()
    if not row:
        conn.close()
        return None
    listing = dict(row)
    if listing["seller_id"] == buyer_id:
        conn.close()
        return None

    cur.execute("UPDATE listings SET status = 'sold', buyer_id = ? WHERE id = ?", (buyer_id, listing_id))
    cur.execute(
        "INSERT INTO purchases (listing_id, buyer_id, seller_id, price) VALUES (?, ?, ?, ?)",
        (listing_id, buyer_id, listing["seller_id"], listing["price"]),
    )
    # продавец получает 100%
    cur.execute("UPDATE users SET balance_sales = balance_sales + ? WHERE user_id = ?", (listing["price"], listing["seller_id"]))
    # реферер получает 10%
    seller = cur.execute("SELECT referrer_id FROM users WHERE user_id = ?", (listing["seller_id"],)).fetchone()
    if seller and seller["referrer_id"]:
        commission = listing["price"] // 10
        cur.execute("UPDATE users SET balance_ref = balance_ref + ?, ref_earned = ref_earned + ? WHERE user_id = ?", (commission, commission, seller["referrer_id"]))
    conn.commit()
    conn.close()
    return listing


def delete_listing(listing_id: int, seller_id: int):
    conn = _connect()
    cur = conn.cursor()
    row = cur.execute("SELECT * FROM listings WHERE id = ? AND seller_id = ? AND status = 'active'", (listing_id, seller_id)).fetchone()
    if not row:
        conn.close()
        return False
    cur.execute("UPDATE listings SET status = 'deleted' WHERE id = ?", (listing_id,))
    conn.commit()
    conn.close()
    return True


def get_balance(user_id: int):
    conn = _connect()
    row = conn.execute("SELECT balance_sales, balance_ref FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"balance_sales": 0, "balance_ref": 0}


def create_withdrawal(user_id: int, amount: int, type_: str):
    conn = _connect()
    cur = conn.cursor()
    if type_ == "sales":
        cur.execute("UPDATE users SET balance_sales = balance_sales - ? WHERE user_id = ? AND balance_sales >= ?", (amount, user_id, amount))
    else:
        cur.execute("UPDATE users SET balance_ref = balance_ref - ? WHERE user_id = ? AND balance_ref >= ?", (amount, user_id, amount))
    if cur.rowcount == 0:
        conn.close()
        return False
    cur.execute("INSERT INTO withdrawals (user_id, amount, type) VALUES (?, ?, ?)", (user_id, amount, type_))
    conn.commit()
    conn.close()
    return True


def get_pending_withdrawals():
    conn = _connect()
    rows = conn.execute("SELECT * FROM withdrawals WHERE status = 'pending' ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

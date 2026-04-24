import { getDb } from "./index";
import bcrypt from "bcryptjs";

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT    NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      excerpt     TEXT    NOT NULL DEFAULT '',
      content     TEXT    NOT NULL DEFAULT '',
      image       TEXT    NOT NULL DEFAULT '',
      category    TEXT    NOT NULL DEFAULT 'Umum',
      author      TEXT    NOT NULL DEFAULT 'OSKADUSI',
      published   INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      read_time   INTEGER NOT NULL DEFAULT 3
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
    AFTER UPDATE ON posts
    BEGIN
      UPDATE posts SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `);

  console.log("[DB] Migrations completed.");
}

export function seedAdmin(): void {
  const db = getDb();

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "oskadusi2026";

  const existing = db
    .prepare("SELECT id FROM admin_users WHERE username = ?")
    .get(adminUsername);

  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      "INSERT INTO admin_users (username, password) VALUES (?, ?)",
    ).run(adminUsername, hash);
    console.log(`[DB] Admin user '${adminUsername}' created.`);
  }
}

export function seedSamplePosts(): void {
  const db = getDb();

  const row = db.prepare("SELECT COUNT(*) as c FROM posts").get() as {
    c: number;
  };

  if (row.c > 0) return;

  const posts = [
    {
      slug: "annual-leadership-summit-2026",
      title: "Annual Leadership Summit Diumumkan untuk 2026",
      excerpt:
        "Bergabunglah dengan acara unggulan kami yang menampilkan pemimpin industri, workshop, dan kesempatan jaringan yang dirancang untuk mengembangkan pemimpin generasi berikutnya.",
      content: `# Annual Leadership Summit 2026

OSKADUSI dengan bangga mengumumkan Annual Leadership Summit 2026! Acara tahunan ini adalah kesempatan emas bagi seluruh siswa SMKN 2 Kota Bekasi.

## Agenda Kegiatan

### Hari Pertama
- 08.00 - 09.00: Registrasi & Welcome Coffee
- 09.00 - 10.30: Opening Ceremony & Keynote Speech
- 10.30 - 12.00: Workshop: Membangun Tim yang Efektif
- 13.00 - 15.00: Panel Discussion: Pemimpin Muda Indonesia
- 15.00 - 17.00: Networking Session

### Hari Kedua
- 08.00 - 10.00: Workshop: Public Speaking & Komunikasi
- 10.00 - 12.00: Studi Kasus Kepemimpinan
- 13.00 - 15.00: Project Pitch Competition
- 15.00 - 17.00: Closing Ceremony & Awarding

## Cara Mendaftar

Pendaftaran dibuka mulai 1 Januari 2026. Isi formulir online melalui media sosial OSKADUSI atau hubungi sekretariat OSIS di lantai 2.

**Kuota terbatas!** Hanya 100 peserta yang dapat bergabung.`,
      image: "/blog-1.jpg",
      category: "Events",
      author: "OSKADUSI",
      published: 1,
      published_at: new Date("2024-03-15").toISOString(),
      read_time: 3,
    },
    {
      slug: "program-mentorship-baru",
      title: "Peluncuran Program Mentorship Baru",
      excerpt:
        "Kami dengan gembira mengumumkan program mentorship kami yang diperluas, menghubungkan siswa senior dengan siswa baru untuk pertumbuhan akademis dan personal.",
      content: `# Program Mentorship OSKADUSI 2026

Setelah sukses dengan program mentorship tahun lalu, OSKADUSI kini meluncurkan program yang lebih terstruktur dan komprehensif!

## Tentang Program

Program Mentorship OSKADUSI menghubungkan siswa kelas 11 dan 12 (mentor) dengan siswa kelas 10 (mentee) untuk membantu adaptasi di lingkungan sekolah baru.

## Manfaat Program

### Untuk Mentee (Kelas 10)
- Mendapat bimbingan dari kakak kelas berpengalaman
- Lebih mudah beradaptasi dengan lingkungan sekolah
- Akses ke tips belajar dan strategi ujian
- Jaringan pertemanan yang lebih luas

### Untuk Mentor (Kelas 11 & 12)
- Mengembangkan kemampuan kepemimpinan
- Mendapat sertifikat program
- Diprioritaskan dalam seleksi OSIS
- Pengalaman berharga untuk portofolio

## Cara Bergabung

**Sebagai Mentor**: Isi formulir di website OSKADUSI. Syarat: nilai rata-rata minimal 80, tidak memiliki catatan disiplin.

**Sebagai Mentee**: Otomatis terdaftar saat MPLS (semua siswa kelas 10).

Program berlangsung selama **1 semester penuh** dengan pertemuan minimal 2x per bulan.`,
      image: "/blog-2.jpg",
      category: "Programs",
      author: "Aulia N.",
      published: 1,
      published_at: new Date("2024-03-10").toISOString(),
      read_time: 4,
    },
  ];

  const insert = db.prepare(`
    INSERT INTO posts (slug, title, excerpt, content, image, category, author, published, published_at, read_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const post of posts) {
      insert.run(
        post.slug,
        post.title,
        post.excerpt,
        post.content,
        post.image,
        post.category,
        post.author,
        post.published,
        post.published_at,
        post.read_time,
      );
    }
    db.exec("COMMIT");
    console.log("[DB] Sample posts seeded.");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

import { PresetFormConfig } from "./types";

export const PRESET_CONFIGS: PresetFormConfig[] = [
  // --- BIDANG PENDIDIKAN ---
  {
    id: "rpp-generator",
    title: "Pembuat RPP & Modul Ajar",
    description: "Sajikan RPP / Modul Ajar Kurikulum Merdeka secara lengkap dan sistematis.",
    category: "pendidikan",
    iconName: "BookOpen",
    fields: [
      {
        id: "subject",
        label: "Mata Pelajaran & Kelas",
        type: "text",
        placeholder: "Contoh: IPA Kelas 8 / Bahasa Indonesia Fase D",
        required: true,
      },
      {
        id: "topic",
        label: "Topik Pembelajaran",
        type: "text",
        placeholder: "Contoh: Struktur Sel Hewan dan Tumbuhan",
        required: true,
      },
      {
        id: "duration",
        label: "Diberi Alokasi Waktu",
        type: "text",
        placeholder: "Contoh: 2 x 40 Menit (1 Pertemuan)",
        defaultValue: "2 x 45 Menit",
      },
      {
        id: "aim",
        label: "Tujuan Pembelajaran Utama",
        type: "textarea",
        placeholder: "Contoh: Siswa dapat membedakan sel hewan dan tumbuhan melalui praktikum saringan sel.",
        required: true,
      },
      {
        id: "method",
        label: "Model / Metode Pembelajaran",
        type: "select",
        defaultValue: "Discovery Learning",
        options: [
          { label: "Discovery Learning", value: "Discovery Learning" },
          { label: "Project-Based Learning (PjBL)", value: "Project-Based Learning" },
          { label: "Problem-Based Learning (PBL)", value: "Problem-Based Learning" },
          { label: "Diskusi & Demostrasi", value: "Diskusi & Demostrasi" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, akademisi ulung dan pakar penyusunan administrasi guru profesional berbasis Kurikulum Merdeka dan K-13.",
    promptTemplate: (v) => `Buatkan Rencana Pelaksanaan Pembelajaran (RPP) / Modul Ajar lengkap dengan kriteria berikut:
- **Mata Pelajaran & Kelas/Fase:** ${v.subject}
- **Topik/Materi Utama:** ${v.topic}
- **Alokasi Waktu:** ${v.duration}
- **Tujuan Pembelajaran:** ${v.aim}
- **Model/Metode:** ${v.method}

RPP harus memuat komponen utama:
1. Tujuan Pembelajaran (Kognitif, Afektif, Psikomotorik)
2. Kegiatan Pembelajaran (Pendahuluan, Inti sesuai fase model ${v.method}, Penutup)
3. Media & Sumber Belajar
4. Asesmen/Penilaian (Formatif & Sumatif dilengkapi rubrik skor singkat)

Ingat untuk langsung berikan isi RPP secara bersih tanpa kalimat pembuka dan penutup.`,
  },
  {
    id: "kti-builder",
    title: "Daftar Struktur KTI & Jurnal",
    description: "Membantu merumuskan draf abstrak, pendahuluan, metode, atau outline Karya Tulis Ilmiah terstruktur.",
    category: "pendidikan",
    iconName: "FileText",
    fields: [
      {
        id: "title",
        label: "Rencana Judul / Topik Penelitian",
        type: "textarea",
        placeholder: "Contoh: Analisis Efektivitas Penggunaan Lab Virtual terhadap Hasil Belajar Siswa IPA",
        required: true,
      },
      {
        id: "field",
        label: "Bidang Keilmuan",
        type: "text",
        placeholder: "Contoh: Pendidikan Teknologi / Sosial Humaniora / Fisika Medis",
        required: true,
      },
      {
        id: "methodology",
        label: "Metode Penelitian Utama",
        type: "select",
        defaultValue: "Kuantitatif Eksperimen",
        options: [
          { label: "Kuantitatif Eksperimen", value: "Kuantitatif Eksperimen" },
          { label: "Qualitative Case Study", value: "Kualitatif Deskriptif / Case Study" },
          { label: "R&D (Research and Development)", value: "R&D (Research and Development)" },
          { label: "Studi Literatur / Systematic Review", value: "Studi Literatur / Meta-Analisis" },
        ],
      },
      {
        id: "focus",
        label: "Fokus Struktur yang Ingin Dibuat",
        type: "select",
        defaultValue: "Struktur Lengkap (Outline Bab I-V)",
        options: [
          { label: "Garis Besar Outline (Bab I - V)", value: "Struktur Lengkap (Outline Bab I-V)" },
          { label: "Draf Abstrak Lengkap (Indo & Inggris)", value: "Draf Abstrak Dual-Bahasa" },
          { label: "Identifikasi Masalah & Latar Belakang", value: "Latar Belakang & Rumusan Masalah" },
          { label: "Kajian Pustaka Pendukung", value: "Kajian Pustaka & Landasan Teori" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, asisten penulisan ilmiah berakurasi akademik tinggi yang mahir menyusun draf KTI, tesis, skripsi, dan jurnal bereputasi.",
    promptTemplate: (v) => `Buatkan draf struktur ilmiah profesional sesuai ketentuan berikut:
- **Judul/Topik:** ${v.title}
- **Bidang:** ${v.field}
- **Metode Penelitian:** ${v.methodology}
- **Fokus Bab/Struktur:** ${v.focus}

Berikan draf yang kaya akan analisis akademis, kalimat-kalimat ilmiah yang kuat, rujukan metodologis yang realistis, serta struktur yang koheren. Hilangkan salam pembuka/penutup.`,
  },
  {
    id: "question-generator",
    title: "Generator Soal Otomatis",
    description: "Membuat kumpulan soal ujian lengkap dengan kunci jawaban dan pembahasan analitik.",
    category: "pendidikan",
    iconName: "HelpCircle",
    fields: [
      {
        id: "grade",
        label: "Mata Pelajaran & Jenjang",
        type: "text",
        placeholder: "Contoh: Matematika Kelas 9 / Kimia SMA Kelas 11",
        required: true,
      },
      {
        id: "spec_topic",
        label: "Topik Pembahasan Spesifik",
        type: "text",
        placeholder: "Contoh: Persamaan Kuadrat / Stoikiometri Reaksi",
        required: true,
      },
      {
        id: "count",
        label: "Jumlah Soal",
        type: "number",
        defaultValue: "5",
        required: true,
      },
      {
        id: "question_type",
        label: "Tipe Soal",
        type: "select",
        defaultValue: "Pilihan Ganda",
        options: [
          { label: "Pilihan Ganda (A, B, C, D, E)", value: "Pilihan Ganda" },
          { label: "Esai Kritis / Analitis", value: "Esai Kritis" },
          { label: "Studi Kasus HOTS (Higher Order Thinking Skills)", value: "Studi Kasus HOTS" },
        ],
      },
      {
        id: "difficulty",
        label: "Tingkat Kesulitan",
        type: "select",
        defaultValue: "Sedang",
        options: [
          { label: "Mudah (Mengingat - C1)", value: "Mudah" },
          { label: "Sedang (Memahami/Menerapkan - C2/C3)", value: "Sedang" },
          { label: "Sulit / HOTS (Menganalisis/Evaluasi - C4/C5/C6)", value: "HOTS / Sulit" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, sebuah asisten pembuat instrumen evaluasi pendidikan profesional dengan objektivitas tinggi.",
    promptTemplate: (v) => `Buatkan paket soal evaluasi pendidikan berdasarkan informasi berikut:
- **Mata Pelajaran & Jenjang:** ${v.grade}
- **Topik Spesifik:** ${v.spec_topic}
- **Jumlah Soal:** ${v.count}
- **Tipe Soal:** ${v.question_type}
- **Tingkat Kesulitan:** ${v.difficulty}

Persyaratan Output:
1. Soal disusun secara rapi dan menantang sesuai level kesulitan.
2. Sediakan kunci jawaban setelah seluruh soal ditulis.
3. Sediakan bagian **Pembahasan** lengkap dan berlogika untuk setiap nomor soal.

Sajikan langsung tanpa teks pengantar basa-basi.`,
  },
  {
    id: "vocab-builder",
    title: "Bahan Bacaan & Kosakata (Mufradat)",
    description: "Menyusun teks bacaan literasi tematik lengkap dengan kosakata baru/mufradat serta latihan.",
    category: "pendidikan",
    iconName: "Languages",
    fields: [
      {
        id: "theme",
        label: "Tema Bacaan",
        type: "text",
        placeholder: "Contoh: Liburan ke Pantai / Lingkungan Sekolah Berkelanjutan",
        required: true,
      },
      {
        id: "lang",
        label: "Bahasa Fokus",
        type: "select",
        defaultValue: "Arab - Indonesia (Mufradat)",
        options: [
          { label: "Bahasa Arab - Indonesia (Mufradat)", value: "Bahasa Arab ke Indonesia" },
          { label: "Bahasa Inggris - Indonesia (Vocabulary)", value: "Bahasa Inggris ke Indonesia" },
          { label: "Bahasa Jepang - Indonesia (Kotoba/Kanji)", value: "Bahasa Jepang ke Indonesia" },
          { label: "Bahasa Indonesia (Lokal / Kesusastraan)", value: "Bahasa Indonesia (Kesusastraan/Sastra)" },
        ],
      },
      {
        id: "reading_level",
        label: "Level Kemampuan",
        type: "select",
        defaultValue: "Pemula (A1-A2)",
        options: [
          { label: "Pemula (A1-A2 / SD-SMP)", value: "Pemula" },
          { label: "Menengah (B1-B2 / SMA)", value: "Menengah" },
          { label: "Mahir (C1-C2 / Umum)", value: "Mahir/Advance" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, asisten pendidik bahasa asing dan pakar pengembangan materi literasi berakurasi leksikal tinggi.",
    promptTemplate: (v) => `Buatkan draf materi belajar membaca dan penguasaan kosakata berdasarkan detail di bawah ini:
- **Tema:** ${v.theme}
- **Bahasa Fokus:** ${v.lang}
- **Level Kemampuan:** ${v.reading_level}

Struktur Output wajib memuat:
1. **Teks Bacaan Singkat** yang mendalam sesuai tema.
2. **Tabel Kosakata Penting (Mufradat/Vocabulary)**: Muat minimal 10 kata penting, cara baca (bila Arab/Jepang), kelas kata, dan artinya.
3. **3 Pertanyaan Pemahaman Reflektif** berdasarkan teks.

Tampilkan output langsung pada topik materi secara mendalam tanpa kalimat pembuka yang tidak penting.`,
  },
  {
    id: "homework-feedback",
    title: "Evaluasi & Umpan Balik Tugas",
    description: "Evaluasi jawaban tugas siswa dan berikan umpan balik konstruktif yang adekuat.",
    category: "pendidikan",
    iconName: "Award",
    fields: [
      {
        id: "instruction",
        label: "Instruksi Tugas Siswa",
        type: "textarea",
        placeholder: "Contoh: Jelaskan mengapa terjadi inflasi pada era ekonomi dunia pasca-perang.",
        required: true,
      },
      {
        id: "rubric",
        label: "Kriteria Penilaian / Rubrik",
        type: "text",
        placeholder: "Contoh: Logika argumen, data sejarah, kerapian deskripsi",
        defaultValue: "Kebenaran konsep akademis, ketepatan analisis, dan keterbacaan penjelasan",
      },
      {
        id: "student_submission",
        label: "Ketik Draf Jawaban Siswa",
        type: "textarea",
        placeholder: "Paste jawaban siswa di sini...",
        required: true,
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, guru dengan empati tinggi dan dedikasi akademis yang memberikan koreksi terarah, jujur, serta mendidik.",
    promptTemplate: (v) => `Evaluasi tugas siswa berikut secara menyeluruh dan beri feedback cerdas:
- **Perintah Tugas:** ${v.instruction}
- **Kondisi Rubrik:** ${v.rubric}
- **Draf Jawaban Siswa:** "${v.student_submission}"

Berikan penilaian terperinci:
1. **Analisis Keunggulan** (Hal apa yang sudah benar dan tepat pada jawaban siswa).
2. **Koreksi Kesalahan** (Jelaskan konsep apa yang kurang tepat/kurang sempurna secara ilmiah).
3. **Usulan Perbaikan Nyata** (Saran konkret menulis draf yang lebih baik).
4. **Skor Estimasi** (Skala 1 - 100).

Langsung berikan analisis evaluasi Anda tanpa pengantar sekunder.`,
  },

  // --- BIDANG UMUM & TEKNIS ---
  {
    id: "code-helper",
    title: "Asisten Kode & Debugging",
    description: "Menulis, optimasi, atau melacak bug pada kode pemrograman secara bersih dan efisien.",
    category: "umum",
    iconName: "Code",
    fields: [
      {
        id: "language",
        label: "Bahasa Pemrograman / Framework",
        type: "text",
        placeholder: "Contoh: TypeScript / React hooks / Python FastAPI",
        required: true,
      },
      {
        id: "task_desc",
        label: "Deskripsi Masalah / Fitur",
        type: "textarea",
        placeholder: "Contoh: Optimalkan pencarian biner, atau temukan kenapa state value ini selalu null setelah async fetch...",
        required: true,
      },
      {
        id: "current_code",
        label: "Kode Saat Ini (Opsional)",
        type: "textarea",
        placeholder: "Tempel kode Anda yang bermasalah di sini...",
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, seorang principal software architect yang mendesain algoritma dan solusi engineering berefisiensi optimal dengan kode bersih (clean code).",
    promptTemplate: (v) => `Lakukan analisis teknis mendalam untuk kebutuhan pengkodean berikut:
- **Bahasa/Teknologi:** ${v.language}
- **Masalah/Fitur:** ${v.task_desc}
${v.current_code ? `- **Kode Asal:** \n\`\`\`${v.language}\n${v.current_code}\n\`\`\`` : ""}

Berikan solusi dalam bentuk:
1. **Analisis Masalah**: Deteksi letak kesalahan atau jelaskan arsitektur logisnya.
2. **Kode Solutif**: Kode lengkap yang bersih, efisien, bermodular, dan disertai komentar penjelas yang efisien.
3. **Cara Kerja**: Penjelasan singkat mengapa solusi ini bekerja lebih andal.

Berikan jawaban langsung tanpa kalimat basa-basi.`,
  },
  {
    id: "document-summarizer",
    title: "Peringkas Dokumen Cerdas",
    description: "Meringkas dokumen, artikel, atau jurnal panjang menjadi draf ringkas berstruktur matang.",
    category: "umum",
    iconName: "CheckSquare",
    fields: [
      {
        id: "doc_text",
        label: "Tempel Teks Panjang Anda",
        type: "textarea",
        placeholder: "Ketik atau paste teks yang ingin Anda ringkas di sini...",
        required: true,
      },
      {
        id: "mode",
        label: "Format Ringkasan",
        type: "select",
        defaultValue: "Poin-Poin Terstruktur",
        options: [
          { label: "Butir-Butir Penting Terstruktur", value: "Poin-Poin Terstruktur" },
          { label: "Paragraf Eksekutif Kompak", value: "Paragraf Eksekutif Kompak" },
          { label: "Analisis Logis SWOT (Kekuatan, Kelemahan,dst)", value: "Analisis SWOT" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, seorang analis informasi senior yang memiliki kemampuan mengekstrak intisari teks secara presisi dan sistematis.",
    promptTemplate: (v) => `Berikan ringkasan presisi tingkat tinggi untuk teks di bawah ini:
- **Format Sasaran:** ${v.mode}
- **Teks Sumber:**
"${v.doc_text}"

Identifikasi poin kunci, informasi penting, argumen utama, dan fakta krusial. Sajikan langsung dalam bentuk ringkasan struktural tanpa pengantar.`,
  },
  {
    id: "natural-translator",
    title: "Penerjemah Alami (Natural)",
    description: "Menerjemahkan teks antar-bahasa dengan menjaga konteks kebudayaan dan nada yang natural.",
    category: "umum",
    iconName: "Globe",
    fields: [
      {
        id: "text_to_translate",
        label: "Pemberitahuan Teks Asli",
        type: "textarea",
        placeholder: "Ketik teks asal di sini...",
        required: true,
      },
      {
        id: "target_lang",
        label: "Bahasa Penerima / Bahasa Target",
        type: "text",
        placeholder: "Contoh: Bahasa Inggris (US), Bahasa Arab (Formal), Bahasa Jawa (Kromo)",
        required: true,
      },
      {
        id: "tone",
        label: "Gaya Bahasa / Tone",
        type: "select",
        defaultValue: "Semi-Formal",
        options: [
          { label: "Semi-Formal / Profesional", value: "Profesional dan Semi-Formal" },
          { label: "Santai / Gaul Sehari-hari", value: "Santai, Kasual dan Alami" },
          { label: "Sastra / Elegan dan Puitis", value: "Indah, Sastra dan Puitis" },
          { label: "Bisnis / Korporat", value: "Bisnis Keuangan Kaku" },
        ],
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, pelokalisasi bahasa dan penerjemah multibahasa dengan kemampuan menerjemahkan makna sejati sesuai tata sosial budaya setempat.",
    promptTemplate: (v) => `Terjemahkan teks berikut secara natural dan akurat:
- **Teks Asal:** "${v.text_to_translate}"
- **Bahasa Target:** ${v.target_lang}
- **Gaya Bahasa:** ${v.tone}

Pastikan diksi terdengar alami (tidak seperti terjemahan mesin yang kaku), memiliki gramatikal yang benar, dan melancarkan arus pemahaman. Tampilkan terjemahan langsung tanpa kalimat pembuka/penutup.`,
  },
  {
    id: "copywriter-creative",
    title: "Penulisan Kreatif & Copywriting",
    description: "Membuat teks promosi (copywriting), draf naskah video, artikel blog, atau tulisan kreatif.",
    category: "umum",
    iconName: "PenTool",
    fields: [
      {
        id: "format",
        label: "Format Tulisan",
        type: "select",
        defaultValue: "Copywriting Media Sosial (AIDA)",
        options: [
          { label: "Copywriting Iklan (AIDA - Attention, Interest, Desire, Action)", value: "Copywriting Formula AIDA" },
          { label: "Artikel Blog SEO friendly", value: "Artikel Blog SEO" },
          { label: "Naskah Video TikTok / YouTube Reel", value: "Naskah Video Kreatif" },
          { label: "Slogan & Tagline Produk", value: "Slogan & Tagline" },
        ],
      },
      {
        id: "topic",
        label: "Topik Pembahasan / Produk",
        type: "textarea",
        placeholder: "Contoh: Jasa bimbingan belajar khusus UTBK atau peluncuran kopi botolan gula aren baru",
        required: true,
      },
      {
        id: "target_audience",
        label: "Target Pembaca / Audiens",
        type: "text",
        placeholder: "Contoh: Gen Z usia 15-18 tahun, atau Ibu Rumah Tangga peduli gizi",
        required: true,
      },
    ],
    systemInstruction: "Kamu adalah AHIM AI, copywriter senior pemenang penghargaan yang sangat mengerti psikologi konsumen dan teknik persuasif.",
    promptTemplate: (v) => `Buatkan tulisan kreatif persuasif bermutu tinggi dengan kriteria berikut:
- **Format:** ${v.format}
- **Topik/Produk:** ${v.topic}
- **Target Pembaca:** ${v.target_audience}

Tulisan harus memikat, menggugah emosi positif/ingin membeli, komunikatif, dan dirancang dengan tata bahasa yang prima. Tampilkan langsung hasilnya tanpa pengantar basa-basi apa pun.`,
  },
];

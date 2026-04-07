// skaters.js
// Roll Show – Skater, Group, Shows, Music, Collabs, Merch, Cards, Messaging, Analytics
// All SQL is aligned with your actual D1 schema as pasted.

// This module expects a D1 database instance (Cloudflare D1 style) passed in as `db`.
// Example wiring from a Worker:
//   import { makeSkatersApi } from './skaters.js';
//   const api = makeSkatersApi(env.DB_users);

// ---------- helpers ----------

function nowIso() {
  return new Date().toISOString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// D1 helpers
async function one(db, sql, ...params) {
  const res = await db.prepare(sql).bind(...params).first();
  return res || null;
}

async function all(db, sql, ...params) {
  const res = await db.prepare(sql).bind(...params).all();
  return res.results || [];
}

async function run(db, sql, ...params) {
  return db.prepare(sql).bind(...params).run();
}

// ---------- main factory ----------

export function makeSkatersApi(db) {
  return {
    // identity
    createSkaterProfile,
    updateSkaterProfile,
    getSkaterProfile,
    requestDisciplineChange,
    approveDisciplineChange,

    // groups
    createSkaterGroup,
    addSkaterToGroup,
    removeSkaterFromGroup,
    listSkaterGroupsForSkater,

    // offerings (lessons, etc.)
    createSkaterOffering,
    updateSkaterOffering,
    listSkaterOfferings,

    // music (skater side)
    uploadTrackForSkater,
    addTrackToSkaterLibrary,
    removeTrackFromSkaterLibrary,
    listSkaterMusicLibrary,

    // shows
    createShowForSkaterOrGroup,
    updateShow,
    cancelShow,
    listShowsForHost,

    // collabs
    sendCollabRequest,
    respondToCollabRequest,
    postCollabChatMessage,
    listCollabChat,
    listCollabsForUser,

    // merch
    createMerchItem,
    updateMerchItem,
    listMerchItemsForSkater,

    // skate cards
    createSkateCard,
    listSkateCardsForSkater,

    // messaging
    sendMessage,
    listMessagesForUserByRole,

    // analytics
    getSkaterFinancialAnalytics,
  };

  // ---------- SKATER IDENTITY ----------

  async function createSkaterProfile(
    userId,
    {
      display_name,
      bio,
      discipline,
      subclass,
      avatar_url,
      city,
      state,
      booking_fee_cents = 0,
      home_rink = null,
    },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO skater_profiles (
        id, user_id, display_name, bio,
        discipline, subclass,
        avatar_url, city, state,
        booking_fee_cents, home_rink,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      userId,
      display_name || null,
      bio || null,
      discipline || null,
      subclass || null,
      avatar_url || null,
      city || null,
      state || null,
      booking_fee_cents,
      home_rink,
      created_at,
    );

    return await getSkaterProfileById(id);
  }

  async function updateSkaterProfile(
    skaterId,
    {
      display_name,
      bio,
      avatar_url,
      city,
      state,
      booking_fee_cents,
      home_rink,
    },
  ) {
    const profile = await getSkaterProfileById(skaterId);
    assert(profile, 'Skater profile not found');

    await run(
      db,
      `
      UPDATE skater_profiles
      SET
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        booking_fee_cents = COALESCE(?, booking_fee_cents),
        home_rink = COALESCE(?, home_rink)
      WHERE id = ?
      `,
      display_name ?? null,
      bio ?? null,
      avatar_url ?? null,
      city ?? null,
      state ?? null,
      booking_fee_cents ?? null,
      home_rink ?? null,
      skaterId,
    );

    return await getSkaterProfileById(skaterId);
  }

  async function getSkaterProfile(userId) {
    return await one(
      db,
      `SELECT * FROM skater_profiles WHERE user_id = ?`,
      userId,
    );
  }

  async function getSkaterProfileById(skaterId) {
    return await one(
      db,
      `SELECT * FROM skater_profiles WHERE id = ?`,
      skaterId,
    );
  }

  async function requestDisciplineChange(
    skaterId,
    { new_discipline, new_subclass, terms_json },
  ) {
    const profile = await getSkaterProfileById(skaterId);
    assert(profile, 'Skater profile not found');

    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO contracts (
        id, template_slug, role, profile_id, status, signed_at, terms_json, created_at
      )
      VALUES (?, 'discipline_change', 'skater', ?, 'pending', NULL, ?, ?)
      `,
      id,
      skaterId,
      JSON.stringify({
        current_discipline: profile.discipline,
        current_subclass: profile.subclass,
        requested_discipline: new_discipline,
        requested_subclass: new_subclass,
        meta: terms_json || null,
      }),
      created_at,
    );

    return { contract_id: id, status: 'pending' };
  }

  async function approveDisciplineChange(contractId, { approved_by_owner }) {
    assert(approved_by_owner === true, 'Owner approval required');

    const contract = await one(
      db,
      `SELECT * FROM contracts WHERE id = ? AND template_slug = 'discipline_change'`,
      contractId,
    );
    assert(contract, 'Discipline change contract not found');

    const terms = contract.terms_json ? JSON.parse(contract.terms_json) : null;
    assert(terms, 'Invalid contract terms_json');

    const { requested_discipline, requested_subclass } = terms;
    assert(requested_discipline, 'Missing requested_discipline');
    assert(requested_subclass, 'Missing requested_subclass');

    const signed_at = nowIso();

    await run(
      db,
      `
      UPDATE contracts
      SET status = 'approved', signed_at = ?
      WHERE id = ?
      `,
      signed_at,
      contractId,
    );

    await run(
      db,
      `
      UPDATE skater_profiles
      SET discipline = ?, subclass = ?
      WHERE id = ?
      `,
      requested_discipline,
      requested_subclass,
      contract.profile_id,
    );

    return { contract_id: contractId, status: 'approved' };
  }

  // ---------- GROUPS ----------

  async function createSkaterGroup(
    created_by_skater_id,
    { name, description, avatar_url, visibility = 'public' },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO skater_groups (
        id, name, description, avatar_url, visibility, created_by_skater_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      name,
      description || null,
      avatar_url || null,
      visibility,
      created_by_skater_id,
      created_at,
    );

    const memberId = crypto.randomUUID();
    await run(
      db,
      `
      INSERT INTO skater_group_members (
        id, group_id, skater_id, role, joined_at
      )
      VALUES (?, ?, ?, 'leader', ?)
      `,
      memberId,
      id,
      created_by_skater_id,
      created_at,
    );

    return await one(db, `SELECT * FROM skater_groups WHERE id = ?`, id);
  }

  async function addSkaterToGroup(group_id, skater_id, role = 'member') {
    const joined_at = nowIso();
    const id = crypto.randomUUID();

    await run(
      db,
      `
      INSERT INTO skater_group_members (
        id, group_id, skater_id, role, joined_at
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      id,
      group_id,
      skater_id,
      role,
      joined_at,
    );

    return await all(
      db,
      `SELECT * FROM skater_group_members WHERE group_id = ?`,
      group_id,
    );
  }

  async function removeSkaterFromGroup(group_id, skater_id) {
    await run(
      db,
      `
      DELETE FROM skater_group_members
      WHERE group_id = ? AND skater_id = ?
      `,
      group_id,
      skater_id,
    );

    return await all(
      db,
      `SELECT * FROM skater_group_members WHERE group_id = ?`,
      group_id,
    );
  }

  async function listSkaterGroupsForSkater(skater_id) {
    return await all(
      db,
      `
      SELECT g.*
      FROM skater_groups g
      JOIN skater_group_members m ON m.group_id = g.id
      WHERE m.skater_id = ?
      `,
      skater_id,
    );
  }

  // ---------- OFFERINGS ----------

  async function createSkaterOffering(
    skater_id,
    {
      offering_type,
      title,
      description,
      base_price_cents,
      duration_minutes,
      is_active = 1,
    },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO skater_offerings (
        id, skater_id, offering_type, title, description,
        base_price_cents, duration_minutes, is_active, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      skater_id,
      offering_type,
      title,
      description || null,
      base_price_cents,
      duration_minutes || null,
      is_active,
      created_at,
    );

    return await one(db, `SELECT * FROM skater_offerings WHERE id = ?`, id);
  }

  async function updateSkaterOffering(
    offering_id,
    {
      title,
      description,
      base_price_cents,
      duration_minutes,
      is_active,
    },
  ) {
    await run(
      db,
      `
      UPDATE skater_offerings
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        base_price_cents = COALESCE(?, base_price_cents),
        duration_minutes = COALESCE(?, duration_minutes),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
      `,
      title ?? null,
      description ?? null,
      base_price_cents ?? null,
      duration_minutes ?? null,
      is_active ?? null,
      offering_id,
    );

    return await one(db, `SELECT * FROM skater_offerings WHERE id = ?`, offering_id);
  }

  async function listSkaterOfferings(skater_id) {
    return await all(
      db,
      `SELECT * FROM skater_offerings WHERE skater_id = ? AND is_active = 1`,
      skater_id,
    );
  }

  // ---------- MUSIC ----------

  async function uploadTrackForSkater(
    musician_id,
    {
      title,
      description,
      genre,
      bpm,
      duration_seconds,
      r2_key,
      artwork_r2_key,
      isrc,
      visibility = 'public',
      price_cents = 100,
      license_to_rollshow = 0,
      royalty_split_json = null,
    },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO tracks (
        id, musician_id, title, description, genre, bpm, duration_seconds,
        r2_key, artwork_r2_key, isrc, visibility,
        price_cents, license_to_rollshow, royalty_split_json,
        status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `,
      id,
      musician_id,
      title,
      description || null,
      genre || null,
      bpm || null,
      duration_seconds || null,
      r2_key,
      artwork_r2_key || null,
      isrc || null,
      visibility,
      price_cents,
      license_to_rollshow,
      royalty_split_json ? JSON.stringify(royalty_split_json) : null,
      created_at,
    );

    return await one(db, `SELECT * FROM tracks WHERE id = ?`, id);
  }

  async function addTrackToSkaterLibrary(skater_id, track_id) {
    const id = crypto.randomUUID();
    const added_at = nowIso();

    await run(
      db,
      `
      INSERT INTO skater_music_library (
        id, skater_id, track_id, added_at
      )
      VALUES (?, ?, ?, ?)
      `,
      id,
      skater_id,
      track_id,
      added_at,
    );

    return await listSkaterMusicLibrary(skater_id);
  }

  async function removeTrackFromSkaterLibrary(skater_id, track_id) {
    await run(
      db,
      `
      DELETE FROM skater_music_library
      WHERE skater_id = ? AND track_id = ?
      `,
      skater_id,
      track_id,
    );

    return await listSkaterMusicLibrary(skater_id);
  }

  async function listSkaterMusicLibrary(skater_id) {
    return await all(
      db,
      `
      SELECT sml.*, t.title, t.genre, t.duration_seconds, t.r2_key, t.artwork_r2_key
      FROM skater_music_library sml
      JOIN tracks t ON t.id = sml.track_id
      WHERE sml.skater_id = ?
      ORDER BY sml.added_at DESC
      `,
      skater_id,
    );
  }

  // ---------- SHOWS ----------

  async function createShowForSkaterOrGroup({
    host_type,
    host_id,
    title,
    description,
    show_type,
    location_name,
    address,
    city,
    state,
    country,
    latitude,
    longitude,
    virtual_link,
    start_time,
    end_time,
    base_price_cents = 0,
    booking_fee_cents = 0,
    funding_goal_cents = 0,
  }) {
    assert(host_type === 'skater' || host_type === 'group', 'Invalid host_type');

    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO shows (
        id, host_type, host_id,
        title, description, show_type,
        location_name, address, city, state, country,
        latitude, longitude,
        virtual_link,
        start_time, end_time,
        base_price_cents, booking_fee_cents,
        funding_goal_cents, funding_status,
        weather_snapshot_json,
        qr_code_url,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', NULL, NULL, 'active', ?)
      `,
      id,
      host_type,
      host_id,
      title,
      description || null,
      show_type,
      location_name || null,
      address || null,
      city || null,
      state || null,
      country || null,
      latitude || null,
      longitude || null,
      virtual_link || null,
      start_time,
      end_time || null,
      base_price_cents,
      booking_fee_cents,
      funding_goal_cents,
      created_at,
    );

    return await one(db, `SELECT * FROM shows WHERE id = ?`, id);
  }

  async function updateShow(
    show_id,
    {
      title,
      description,
      show_type,
      location_name,
      address,
      city,
      state,
      country,
      latitude,
      longitude,
      virtual_link,
      start_time,
      end_time,
      base_price_cents,
      booking_fee_cents,
      funding_goal_cents,
      status,
    },
  ) {
    await run(
      db,
      `
      UPDATE shows
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        show_type = COALESCE(?, show_type),
        location_name = COALESCE(?, location_name),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        virtual_link = COALESCE(?, virtual_link),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        base_price_cents = COALESCE(?, base_price_cents),
        booking_fee_cents = COALESCE(?, booking_fee_cents),
        funding_goal_cents = COALESCE(?, funding_goal_cents),
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      title ?? null,
      description ?? null,
      show_type ?? null,
      location_name ?? null,
      address ?? null,
      city ?? null,
      state ?? null,
      country ?? null,
      latitude ?? null,
      longitude ?? null,
      virtual_link ?? null,
      start_time ?? null,
      end_time ?? null,
      base_price_cents ?? null,
      booking_fee_cents ?? null,
      funding_goal_cents ?? null,
      status ?? null,
      show_id,
    );

    return await one(db, `SELECT * FROM shows WHERE id = ?`, show_id);
  }

  async function cancelShow(show_id) {
    await run(
      db,
      `
      UPDATE shows
      SET status = 'cancelled'
      WHERE id = ?
      `,
      show_id,
    );

    return await one(db, `SELECT * FROM shows WHERE id = ?`, show_id);
  }

  async function listShowsForHost(host_type, host_id) {
    return await all(
      db,
      `
      SELECT * FROM shows
      WHERE host_type = ? AND host_id = ?
      ORDER BY start_time DESC
      `,
      host_type,
      host_id,
    );
  }

  // ---------- COLLABS ----------

  async function sendCollabRequest(
    from_user_id,
    to_user_id,
    { type, message, spot, date, time, deadline },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO collabs (
        id, from_user, to_user, type, status, message, spot, date, time, deadline, created_at
      )
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `,
      id,
      from_user_id,
      to_user_id,
      type,
      message || null,
      spot || null,
      date || null,
      time || null,
      deadline || null,
      created_at,
    );

    return await one(db, `SELECT * FROM collabs WHERE id = ?`, id);
  }

  async function respondToCollabRequest(collab_id, { status, note }) {
    assert(['accepted', 'declined', 'cancelled'].includes(status), 'Invalid collab status');

    await run(
      db,
      `
      UPDATE collabs
      SET status = ?
      WHERE id = ?
      `,
      status,
      collab_id,
    );

    const historyId = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO collab_history (
        id, collab_id, status, note, created_at
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      historyId,
      collab_id,
      status,
      note || null,
      created_at,
    );

    return await one(db, `SELECT * FROM collabs WHERE id = ?`, collab_id);
  }

  async function postCollabChatMessage(collab_id, user_id, text) {
    const id = crypto.randomUUID();
    const timestamp = nowIso();

    await run(
      db,
      `
      INSERT INTO collab_chat (
        id, collab_id, user_id, text, timestamp
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      id,
      collab_id,
      user_id,
      text,
      timestamp,
    );

    return await listCollabChat(collab_id);
  }

  async function listCollabChat(collab_id) {
    return await all(
      db,
      `
      SELECT c.*, u.username
      FROM collab_chat c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.collab_id = ?
      ORDER BY c.timestamp ASC
      `,
      collab_id,
    );
  }

  async function listCollabsForUser(user_id) {
    return await all(
      db,
      `
      SELECT *
      FROM collabs
      WHERE from_user = ? OR to_user = ?
      ORDER BY created_at DESC
      `,
      user_id,
      user_id,
    );
  }

  // ---------- MERCH ----------

  async function createMerchItem(
    skater_id,
    { title, description, price_cents, image_url },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO merch_items (
        id, skater_id, title, description, price_cents, image_url, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      skater_id,
      title,
      description || null,
      price_cents,
      image_url || null,
      created_at,
    );

    return await one(db, `SELECT * FROM merch_items WHERE id = ?`, id);
  }

  async function updateMerchItem(
    merch_id,
    { title, description, price_cents, image_url },
  ) {
    await run(
      db,
      `
      UPDATE merch_items
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price_cents = COALESCE(?, price_cents),
        image_url = COALESCE(?, image_url)
      WHERE id = ?
      `,
      title ?? null,
      description ?? null,
      price_cents ?? null,
      image_url ?? null,
      merch_id,
    );

    return await one(db, `SELECT * FROM merch_items WHERE id = ?`, merch_id);
  }

  async function listMerchItemsForSkater(skater_id) {
    return await all(
      db,
      `
      SELECT * FROM merch_items
      WHERE skater_id = ?
      ORDER BY created_at DESC
      `,
      skater_id,
    );
  }

  // ---------- SKATE CARDS ----------

  async function createSkateCard(
    skater_id,
    {
      title,
      description,
      image_url,
      rarity,
      edition_size,
      price_cents,
      card_type = 'standard',
      qr_code_url,
    },
  ) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO skate_cards (
        id, skater_id, title, description,
        image_url, rarity, edition_size, price_cents,
        card_type, qr_code_url,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      skater_id,
      title,
      description || null,
      image_url || null,
      rarity || null,
      edition_size || null,
      price_cents || null,
      card_type,
      qr_code_url || null,
      created_at,
    );

    return await one(db, `SELECT * FROM skate_cards WHERE id = ?`, id);
  }

  async function listSkateCardsForSkater(skater_id) {
    return await all(
      db,
      `
      SELECT * FROM skate_cards
      WHERE skater_id = ?
      ORDER BY created_at DESC
      `,
      skater_id,
    );
  }

  // ---------- MESSAGING ----------

  async function sendMessage({
    sender_user_id,
    receiver_user_id,
    sender_role,
    receiver_role,
    message_type = 'chat',
    content,
    media_url,
    media_type,
    is_request = 0,
    request_type,
  }) {
    const id = crypto.randomUUID();
    const created_at = nowIso();

    await run(
      db,
      `
      INSERT INTO messages (
        id,
        sender_user_id, receiver_user_id,
        sender_role, receiver_role,
        message_type,
        content, media_url, media_type,
        is_request, request_type, request_status,
        created_at, read_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL)
      `,
      id,
      sender_user_id,
      receiver_user_id,
      sender_role,
      receiver_role,
      message_type,
      content || null,
      media_url || null,
      media_type || null,
      is_request ? 1 : 0,
      request_type || null,
      created_at,
    );

    return await one(db, `SELECT * FROM messages WHERE id = ?`, id);
  }

  async function listMessagesForUserByRole(user_id, roleFilter) {
    return await all(
      db,
      `
      SELECT *
      FROM messages
      WHERE receiver_user_id = ?
        AND sender_role = ?
      ORDER BY created_at DESC
      `,
      user_id,
      roleFilter,
    );
  }

  // ---------- ANALYTICS ----------

  async function getSkaterFinancialAnalytics(skater_id) {
    const royaltyAccount = await one(
      db,
      `
      SELECT *
      FROM royalty_accounts
      WHERE role = 'skater' AND profile_id = ?
      `,
      skater_id,
    );

    let royaltyBalance = 0;
    let royaltyEvents = [];
    if (royaltyAccount) {
      royaltyBalance = royaltyAccount.balance_cents;
      royaltyEvents = await all(
        db,
        `
        SELECT *
        FROM royalty_events
        WHERE account_id = ?
        ORDER BY created_at DESC
        `,
        royaltyAccount.id,
      );
    }

    const showRevenueRows = await all(
      db,
      `
      SELECT
        s.id AS show_id,
        s.title,
        SUM(t.price_cents) AS total_ticket_cents,
        COUNT(t.id) AS ticket_count
      FROM shows s
      JOIN tickets t ON t.show_id = s.id
      WHERE s.host_type = 'skater'
        AND s.host_id = ?
        AND t.status IN ('charged')
      GROUP BY s.id, s.title
      `,
      skater_id,
    );

    const totalTicketCents = showRevenueRows.reduce(
      (sum, r) => sum + (r.total_ticket_cents || 0),
      0,
    );

    const merchRevenueRows = await all(
      db,
      `
      SELECT
        m.id AS merch_id,
        m.title,
        SUM(o.total_cents) AS total_merch_cents,
        COUNT(o.id) AS order_count
      FROM merch_items m
      JOIN merch_orders o ON o.merch_id = m.id
      WHERE m.skater_id = ?
        AND o.status IN ('paid', 'fulfilled')
      GROUP BY m.id, m.title
      `,
      skater_id,
    );

    const totalMerchCents = merchRevenueRows.reduce(
      (sum, r) => sum + (r.total_merch_cents || 0),
      0,
    );

    const cardRevenueRows = await all(
      db,
      `
      SELECT
        sc.id AS card_id,
        sc.title,
        SUM(scs.amount_cents) AS total_card_cents,
        COUNT(scs.id) AS sale_count
      FROM skate_cards sc
      JOIN skate_card_sales scs ON scs.card_id = sc.id
      WHERE sc.skater_id = ?
      GROUP BY sc.id, sc.title
      `,
      skater_id,
    );

    const totalCardCents = cardRevenueRows.reduce(
      (sum, r) => sum + (r.total_card_cents || 0),
      0,
    );

    return {
      skater_id,
      royalty: {
        balance_cents: royaltyBalance,
        events: royaltyEvents,
      },
      tickets: {
        total_cents: totalTicketCents,
        by_show: showRevenueRows,
      },
      merch: {
        total_cents: totalMerchCents,
        by_item: merchRevenueRows,
      },
      skate_cards: {
        total_cents: totalCardCents,
        by_card: cardRevenueRows,
      },
    };
  }
}

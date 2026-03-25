

## Plan: Replace mock data with real Ballarat Hockey divisions and teams

The user has provided real competition data to populate the database. This requires a database migration to clear existing data and insert the correct divisions and teams with proper associations.

### Data extracted from the image

**Divisions:**
1. Division 1 Open
2. Division 1 Women
3. Division 2 Open

**Teams (with division assignments):**

| Team Name | Division |
|-----------|----------|
| Blaze | Div 1 Open, Div 1 Women, Div 2 Open |
| Bobcats | Div 1 Open, Div 1 Women, Div 2 Open |
| Ducks | Div 1 Open, Div 1 Women |
| EGC | Div 1 Open, Div 1 Women |
| Lucas | Div 1 Open, Div 1 Women, Div 2 Open |
| EGC Blue | Div 2 Open |
| EGC Gold | Div 2 Open |
| Pumas | Div 2 Open |

**Note:** Some teams (Blaze, Bobcats, etc.) appear in multiple divisions. Since the `teams` table has a single `division_id`, we need to either:
- Create separate team entries per division (e.g. "Blaze" in Div 1 Open and "Blaze" in Div 1 Women are separate rows)
- Or remove the `division_id` FK from teams and handle the association through fixtures

The cleaner approach is **separate team entries per division** since voting and fixtures are division-specific, and team names can differ per division (e.g. "EGC Blue" vs "EGC Gold").

### Changes

**1. Database migration:**
- Delete existing teams and divisions (cascade will handle dependent data)
- Insert 3 divisions
- Insert teams linked to their respective divisions:
  - Div 1 Open: Blaze, Bobcats, Ducks, EGC, Lucas (5 teams)
  - Div 1 Women: Blaze, Bobcats, Ducks, EGC, Lucas (5 teams)
  - Div 2 Open: Blaze, Bobcats, EGC Blue, EGC Gold, Pumas, Lucas (6 teams)

Total: 16 team rows across 3 divisions.

**2. UI update — ManageFixtures.tsx:**
- Filter the team dropdowns by the selected division so admins only see relevant teams when creating fixtures.

**3. UI update — UmpireVote.tsx:**
- Similarly filter teams by selected division in the umpire voting flow.


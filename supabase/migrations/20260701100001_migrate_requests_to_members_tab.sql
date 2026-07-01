-- Migrate sport_configs: rename "requests" admin tab to "members" in JSONB config.
-- Any sport config that has an adminTabs array with an entry having id="requests"
-- needs to be updated to id="members" with the new label and icon.

UPDATE public.sport_configs
SET config = jsonb_set(
  config,
  '{adminTabs}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'id' = 'requests'
        THEN jsonb_build_object(
          'id', 'members',
          'label', 'Members',
          'iconName', 'Users'
        )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(config->'adminTabs') AS elem
  )
)
WHERE config->'adminTabs' IS NOT NULL
  AND config->'adminTabs' @> '[{"id": "requests"}]';

-- Short-lived strategy transfer fields for dashboard raw-code editing.

-- statement
alter table dashboard_remote_commands
  add column if not exists payload jsonb;

-- statement
alter table dashboard_remote_commands
  add column if not exists result_data jsonb;

-- statement
alter table dashboard_remote_commands
  drop constraint if exists dashboard_remote_commands_command_check;

-- statement
alter table dashboard_remote_commands
  add constraint dashboard_remote_commands_command_check
  check (command in ('start', 'pause', 'resume', 'stop', 'select_strategy_1', 'select_strategy_2', 'read_strategy_1', 'read_strategy_2', 'stage_strategy_edit'));

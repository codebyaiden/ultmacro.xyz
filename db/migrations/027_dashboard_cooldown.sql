-- Add bounded cooldown commands to supported desktop companions.
-- statement
alter table dashboard_remote_commands
  drop constraint if exists dashboard_remote_commands_command_check;

-- statement
alter table dashboard_remote_commands
  add constraint dashboard_remote_commands_command_check
  check (command in ('start', 'pause', 'resume', 'stop', 'stop_after_match', 'cancel_stop_after_match', 'start_cooldown', 'cancel_cooldown', 'close_selected_process', 'select_strategy_1', 'select_strategy_2', 'read_strategy_1', 'read_strategy_2', 'stage_strategy_edit', 'install_library_strategy'));

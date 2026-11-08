-- Allow the dashboard to select an already configured strategy while the macro is stopped.

-- statement
alter table dashboard_remote_commands
  drop constraint if exists dashboard_remote_commands_command_check;

-- statement
alter table dashboard_remote_commands
  add constraint dashboard_remote_commands_command_check
  check (command in ('start', 'pause', 'resume', 'stop', 'select_strategy_1', 'select_strategy_2'));

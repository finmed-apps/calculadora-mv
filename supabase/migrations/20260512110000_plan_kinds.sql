-- ============================================================
-- Migration 3 — Atualizar constraint do plan_kind para suportar one_off_6m
-- ============================================================

alter table public.profiles
  drop constraint if exists profiles_plan_kind_check;

alter table public.profiles
  add constraint profiles_plan_kind_check
  check (plan_kind in ('monthly', 'annual', 'one_off_6m', 'one_off_12m'));

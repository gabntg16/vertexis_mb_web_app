import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Logout Standardization & Redundancy Removal', () => {
  it('confirms standalone quick logout button is removed from TopHeader', () => {
    const topHeaderPath = path.resolve(__dirname, '../components/TopHeader.tsx');
    const content = fs.readFileSync(topHeaderPath, 'utf8');

    // Standalone quick logout button ID should not exist
    expect(content.includes('id="top-quick-logout-btn"')).toBe(false);

    // User profile dropdown logout button must exist
    expect(content.includes('id="user-dropdown-logout-btn"')).toBe(true);
    expect(content.includes('Sign Out of VertexIS')).toBe(true);
  });

  it('confirms sign out button section is removed from SettingsPage', () => {
    const settingsPath = path.resolve(__dirname, '../components/settings/SettingsPage.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    // Sign out button and modal should not exist in SettingsPage
    expect(content.includes('id="settings-logout-btn"')).toBe(false);
    expect(content.includes('LogoutConfirmModal')).toBe(false);
  });

  it('confirms redundant logout buttons are removed from Sidebar', () => {
    const sidebarPath = path.resolve(__dirname, '../components/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // Redundant sidebar logout buttons should not exist
    expect(content.includes('id="sidebar-signout-btn"')).toBe(false);
    expect(content.includes('id="sidebar-collapsed-logout-btn"')).toBe(false);
    expect(content.includes('LogoutConfirmModal')).toBe(false);
  });

  it('confirms LogoutConfirmModal uses createPortal and fixed centered overlay at root document.body', () => {
    const modalPath = path.resolve(__dirname, '../components/common/LogoutConfirmModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Must import and use createPortal to escape navigation header containing block
    expect(content.includes('createPortal')).toBe(true);
    expect(content.includes('document.body')).toBe(true);

    // Must use fixed positioning with inset-0, high z-index, and screen-centered flexbox
    expect(content.includes('fixed inset-0')).toBe(true);
    expect(content.includes('items-center justify-center')).toBe(true);
  });
});

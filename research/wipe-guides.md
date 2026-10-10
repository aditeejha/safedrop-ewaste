# SafeDrop eWaste data-wipe guides

Generated 2026-10-11. Every section cites the vendor's own support page or NIST SP 800-88 Rev. 2 (final, September 2025). Steps marked **[critical]** leak data or lock the device if skipped.

## Android phone or tablet (Android 12 and newer) (`android`)

Applies to: phone, tablet · About 75 minutes

### Back up what you want to keep

1. Open Settings > Google > All services > Backup, then tap Back up now.
   This saves apps and app data, call history, contacts, settings and SMS to your Google Account. Photos and videos are backed up by the Google Photos app.
2. Wait for the backup to finish before you go further.
   Google says a backup can take up to 24 hours to finish. You get 15 GB of storage at no charge.

Sources:
- Google: [Back up or restore data on your Android device](https://support.google.com/android/answer/2819582) (updated: not shown on page)

### Save your WhatsApp chats

1. In WhatsApp, tap the three dots > Settings > Chats > Chat backup > Back up.
   Your chats are saved to your Google Account. You need a Google Account on the phone, Google Play services, enough free space, and a steady internet connection. Use Wi-Fi to avoid mobile data charges.
2. Optional: turn on End-to-end encrypted backup in the same Chat backup screen.
   Choose a passkey, a password or a 64-digit key. WhatsApp says it is the only way to open your backup later, so write it down somewhere safe.

Sources:
- WhatsApp: [How to back up your chat history (Android)](https://faq.whatsapp.com/481135090640375) (updated: not shown on page)

### Get ready before the reset

1. Note your Google Account email and make sure you know its password. **[critical]**
   Check it by signing in on another phone or computer. Google asks for this information after a reset.
2. Keep your phone's PIN, pattern or password handy. **[critical]**
3. Changed your Google password recently? Wait 24 hours before resetting.
   Google's advice for anyone who reset their Google Account password in the last 24 hours.
4. Charge the phone to at least 70% and connect to Wi-Fi or mobile data.
   Google says a reset can take up to an hour.
5. Nothing to switch on for encryption.
   Google's Android security documentation says full-disk encryption is not allowed on new devices running Android 10 and higher; they use file-based encryption instead. The factory reset then removes your data.

Sources:
- Google: [Reset your Android device to factory settings](https://support.google.com/android/answer/6088915) (updated: not shown on page)
- Google: [Encryption (Android Open Source Project)](https://source.android.com/docs/security/features/encryption) (updated: 2026-09-30)

### Remove your Google Account (turns off Factory Reset Protection)

1. Open Settings > Passwords & accounts (or Accounts), tap your Google Account, tap Remove account and confirm. **[critical]**
   On some phones the menu is called Users & accounts or Manage accounts. You will need your PIN, pattern or password.
2. Do this before the reset, not after. **[critical]**
   Google says removing your Google Account turns off device protection. If you skip it, the phone asks for your account after the reset and nobody else can use it.
3. Remove any other accounts listed there (email, work and so on) the same way.
   Removing an account also deletes its email, contacts and settings from the phone.

Sources:
- Google: [Add or remove an account on Android](https://support.google.com/android/answer/7664951) (updated: not shown on page)
- Google: [Help prevent others from using your device without permission (Pixel Phone Help)](https://support.google.com/pixelphone/answer/6172890) (updated: not shown on page)

### Take out your SIM, eSIM and memory card

1. Erase your eSIM: open Settings > Network & internet > Mobile network (or SIMs), pick the eSIM, tap Erase eSIM. **[critical]**
   Menu names vary by brand. If you can't find it, ask your mobile operator to move or deactivate the eSIM. Some steps need Android 11 or later.
2. Switch the phone off and take your SIM card out of the tray. **[critical]**
   Google's trade-in steps say to remove the SIM card but leave the empty tray in the phone.
3. Take out the microSD memory card, if there is one. **[critical]**
   Google warns that erasing a phone may not delete SD cards. Keep the card, or wipe it using the Loose drives guide.

Sources:
- Google: [How to use dual SIMs on your Google Pixel phone](https://support.google.com/pixelphone/answer/9449293) (updated: not shown on page)
- Google: [Send your trade-in device (Google Store Help)](https://support.google.com/store/answer/14282767) (updated: not shown on page)
- Google: [Find, secure, or erase a lost Android device](https://support.google.com/accounts/answer/6160491) (updated: not shown on page)

### Factory reset the phone

1. Open Settings > System > Reset options > Erase all data (factory reset), then tap Erase all data. **[critical]**
   This is the path on Google Pixel phones; other brands use similar menu names. Enter your PIN if asked.
2. If Settings won't open, use the power and volume buttons method from your phone maker's support site.
   Google says most phones are reset from Settings; the button method varies by manufacturer.
3. When the phone restarts, check that it does not ask for your password or Google Account. **[critical]**
   Google says that if it still asks, the reset is not complete and you must do it again.
4. Switch the phone off. It is ready to hand over.

Sources:
- Google: [Reset your Android device to factory settings](https://support.google.com/android/answer/6088915) (updated: not shown on page)
- Google: [Send your trade-in device (Google Store Help)](https://support.google.com/store/answer/14282767) (updated: not shown on page)

### Remove the phone from your Google Account online

1. Go to myaccount.google.com > Security & sign-in > Manage all devices, tap the old phone and tap Sign out.
   Do this from any phone or computer. Google advises signing out on devices that are no longer yours. If several entries share the same name, sign out of all of them.

Sources:
- Google: [See devices with account access](https://support.google.com/accounts/answer/3067630) (updated: not shown on page)

## Samsung Galaxy phone or tablet (`samsung`)

Applies to: phone, tablet · About 75 minutes

### Back up what you want to keep

1. Install Smart Switch on your computer, connect the phone with a USB data cable and select Backup.
   Tap Allow on the phone if asked and tap OK when it finishes. To pick what is saved, go to MORE > Preferences > Backup items.
2. Back up WhatsApp separately (next section).
   Samsung says Smart Switch does not back up secure or encrypted app data such as WhatsApp chats, and some banking app logins won't transfer.
3. You can also back up to Google: Settings > Google > All services > Backup > Back up now.
   This saves contacts, call history, SMS, settings and apps to your Google Account.

Sources:
- Samsung UK: [How to backup your Samsung phone to PC or Mac](https://www.samsung.com/uk/support/mobile-devices/how-do-i-backup-my-smartphone-to-my-pc-or-mac/) (updated: 2026-06-19)
- Google: [Back up or restore data on your Android device](https://support.google.com/android/answer/2819582) (updated: not shown on page)

### Save your WhatsApp chats

1. In WhatsApp, tap the three dots > Settings > Chats > Chat backup > Back up.
   Your chats are saved to your Google Account. You need a Google Account on the phone, Google Play services, enough free space, and a steady internet connection. Use Wi-Fi to avoid mobile data charges.
2. Optional: turn on End-to-end encrypted backup in the same Chat backup screen.
   Choose a passkey, a password or a 64-digit key. WhatsApp says it is the only way to open your backup later, so write it down somewhere safe.

Sources:
- WhatsApp: [How to back up your chat history (Android)](https://faq.whatsapp.com/481135090640375) (updated: not shown on page)

### Get ready before the reset

1. Note your Google Account email and make sure you know its password. **[critical]**
   Check it by signing in on another phone or computer. Google asks for this information after a reset.
2. Keep your phone's PIN, pattern or password handy. **[critical]**
3. Changed your Google password recently? Wait 24 hours before resetting.
   Google's advice for anyone who reset their Google Account password in the last 24 hours.
4. Charge the phone to at least 70% and connect to Wi-Fi or mobile data.
   Google says a reset can take up to an hour.
5. Nothing to switch on for encryption.
   Google's Android security documentation says full-disk encryption is not allowed on new devices running Android 10 and higher; they use file-based encryption instead. The factory reset then removes your data.

Sources:
- Google: [Reset your Android device to factory settings](https://support.google.com/android/answer/6088915) (updated: not shown on page)
- Google: [Encryption (Android Open Source Project)](https://source.android.com/docs/security/features/encryption) (updated: 2026-09-30)

### Remove your Samsung and Google accounts

1. Open Settings > Accounts and backup > Manage accounts > Samsung account > Remove account. Confirm, tap Sign out and enter your Samsung password. **[critical]**
   Samsung says the reset itself needs this password if the Samsung account is still signed in.
2. In the same Manage accounts list, tap your Google Account > Remove account and confirm. **[critical]**
   This turns off Google's Factory Reset Protection so the next owner can set up the phone.

Sources:
- Samsung India: [Remove accounts from your Galaxy phone or tablet](https://www.samsung.com/in/support/mobile-devices/remove-accounts-from-your-galaxy-phone-or-tablet/) (updated: 2024-09-27)
- Samsung India: [How to perform a factory reset on your Samsung Galaxy device](https://www.samsung.com/in/support/mobile-devices/perform-a-factory-reset-on-samsung-galaxy-device/) (updated: 2026-09-03)
- Google: [Help prevent others from using your device without permission (Pixel Phone Help)](https://support.google.com/pixelphone/answer/6172890) (updated: not shown on page)

### Take out your SIM, eSIM and memory card

1. Erase your eSIM from the phone's SIM settings before the reset. **[critical]**
   Google's trade-in checklist says to erase any downloaded SIMs. Menu names vary by model; if you can't find the option, ask your mobile operator to deactivate the eSIM.
2. Switch the phone off and take your SIM card out of the tray. **[critical]**
   Google's trade-in steps say to remove the SIM card but leave the empty tray in the phone.
3. Take out the microSD memory card, if there is one. **[critical]**
   Google warns that erasing a phone may not delete SD cards. Keep the card, or wipe it using the Loose drives guide.

Sources:
- Google: [Send your trade-in device (Google Store Help)](https://support.google.com/store/answer/14282767) (updated: not shown on page)
- Google: [Find, secure, or erase a lost Android device](https://support.google.com/accounts/answer/6160491) (updated: not shown on page)

### Factory reset (One UI)

1. Open Settings > General management > Reset > Factory data reset > Reset > Delete all. **[critical]**
   Enter your Samsung account password if asked. Menu names can differ slightly by model and software version.
2. Always reset from Settings, not with the hardware buttons. **[critical]**
   Samsung says Factory Reset Protection is triggered when a reset is done any way other than Settings > Factory data reset.
3. After the restart, check that the phone does not ask for your Google or Samsung account. **[critical]**
   If it does, the reset is not complete; do it again.

Sources:
- Samsung India: [How to perform a factory reset on your Samsung Galaxy device](https://www.samsung.com/in/support/mobile-devices/perform-a-factory-reset-on-samsung-galaxy-device/) (updated: 2026-09-03)
- Google: [Send your trade-in device (Google Store Help)](https://support.google.com/store/answer/14282767) (updated: not shown on page)

### Remove the phone from your Google Account online

1. Go to myaccount.google.com > Security & sign-in > Manage all devices, tap the old phone and tap Sign out.
   Do this from any phone or computer. Google advises signing out on devices that are no longer yours. If several entries share the same name, sign out of all of them.

Sources:
- Google: [See devices with account access](https://support.google.com/accounts/answer/3067630) (updated: not shown on page)

## iPhone or iPad (`iphone`)

Applies to: phone, tablet · About 60 minutes

### Back up what you want to keep

1. Back up your iPhone or iPad to iCloud or to a computer.
   Apple says to back up first and again just before you erase. If you have a new iPhone, Quick Start can move your data directly.

Sources:
- Apple: [What to do before you sell, give away, or trade in your iPhone or iPad](https://support.apple.com/en-us/109511) (updated: 2026-05-29)

### Save your WhatsApp chats

1. In WhatsApp, tap your profile picture > Chats > Chat Backup > Back Up Now.
   Chats go to your iCloud. You need the same phone number and iCloud account to restore, and free space of at least 2.05 times the backup size in iCloud and on the phone.

Sources:
- WhatsApp: [How to back up to iCloud](https://faq.whatsapp.com/180225246548988) (updated: not shown on page)

### Unpair your Apple Watch

1. On the iPhone, open the Watch app > My Watch > All Watches, tap the info button next to your watch, then tap Unpair Apple Watch.
   Enter your Apple Account password when asked; this turns off Activation Lock on the watch. For cellular watches, choose whether to keep or remove the plan.

Sources:
- Apple: [Unpair and erase your Apple Watch](https://support.apple.com/en-us/108372) (updated: not shown on page)
- Apple: [What to do before you sell, give away, or trade in your iPhone or iPad](https://support.apple.com/en-us/109511) (updated: 2026-05-29)

### Sign out of your Apple Account (turns off Find My and Activation Lock)

1. Open Settings, tap your name, scroll down and tap Sign Out. **[critical]**
   On iOS 26, choose the iCloud and Store option if asked. On iOS 18 or earlier, enter your Apple Account password and tap Turn Off.
2. Moving to an Android phone? Deregister iMessage too.

Sources:
- Apple: [What to do before you sell, give away, or trade in your iPhone or iPad](https://support.apple.com/en-us/109511) (updated: 2026-05-29)

### Erase the iPhone or iPad

1. Open Settings > General > Transfer or Reset > Erase All Content and Settings. **[critical]**
   Enter your passcode if asked and confirm. Apple says erasing also turns off Find My and Activation Lock; you may need your Apple Account password.
2. If you use an eSIM, choose to erase the device and the eSIM profile when asked. **[critical]**
   If your device doesn't use a SIM card, contact your mobile operator to move the service.
3. Take out the physical SIM card, if there is one. **[critical]**
   General advice, not an Apple step: the SIM carries your phone number.

Sources:
- Apple: [What to do before you sell, give away, or trade in your iPhone or iPad](https://support.apple.com/en-us/109511) (updated: 2026-05-29)

### Remove it from your Apple Account device list

1. On another Apple device, go to Settings > your name, tap the old device and tap Remove from Account. Or use account.apple.com > Devices.
   Removed devices lose access to iCloud and Find My and stop showing two-factor codes.
2. Already handed it over without erasing? Go to icloud.com/find, select the device and tap Remove This Device. **[critical]**
   Apple says to erase first, then remove. Also change your Apple Account password.

Sources:
- Apple: [Review devices signed in to your Apple Account](https://support.apple.com/en-us/102649) (updated: not shown on page)
- Apple: [Remove a device from Find Devices on iCloud.com](https://support.apple.com/guide/icloud/remove-a-device-mmfc0eeddd/icloud) (updated: not shown on page)
- Apple: [What to do before you sell, give away, or trade in your iPhone or iPad](https://support.apple.com/en-us/109511) (updated: 2026-05-29)

## Windows laptop or desktop (`windows`)

Applies to: laptop, desktop · About 150 minutes

### Back up what you want to keep

1. Use Windows Backup to save the files and settings you want to keep.
   Microsoft recommends this before you recycle, sell or gift a PC.

Sources:
- Microsoft: [Before you recycle, sell, or gift your Xbox or Windows PC](https://support.microsoft.com/en-us/accounts-billing/security/before-you-recycle-sell-or-gift-your-xbox-or-windows-pc) (updated: not shown on page)

### Check encryption and your BitLocker key

1. Open Settings > Privacy & security > Device encryption to see if encryption is on.
   Device encryption is available even on Windows Home. When you set up the PC with a Microsoft account, the recovery key is attached to that account.
2. If the PC is encrypted, make sure you have your BitLocker recovery key before resetting. **[critical]**
   Microsoft says you need it to complete a reset started from the recovery screen.

Sources:
- Microsoft: [Device Encryption in Windows](https://support.microsoft.com/en-us/windows/device-encryption-in-windows-cf7e2b6f-3e70-4882-9532-18633605b7df) (updated: not shown on page)
- Microsoft: [Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e) (updated: not shown on page)

### Reset with Remove everything and Clean data

1. Open Settings > System > Recovery and select Reset PC. **[critical]**
2. Choose Remove everything. **[critical]**
   This removes all personal files, apps and settings and reinstalls Windows.
3. Choose Clean data, then follow the on-screen steps. **[critical]**
   Microsoft says to use this if you plan to donate, recycle or sell the PC. It takes longer but makes removed files harder to recover.
4. For very sensitive data, also follow the Loose drives guide.
   Microsoft notes this erasure is aimed at consumers and does not meet government and industry data-erasure standards.

Sources:
- Microsoft: [Reset your PC](https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e) (updated: not shown on page)
- Microsoft: [Before you recycle, sell, or gift your Xbox or Windows PC](https://support.microsoft.com/en-us/accounts-billing/security/before-you-recycle-sell-or-gift-your-xbox-or-windows-pc) (updated: not shown on page)

### Remove the PC from your Microsoft account

1. Go to account.microsoft.com/devices, select Show details for the PC, then More actions > Remove. Tick "I'm ready to remove this device" and select Remove.
   Do this after the reset.
2. On the same page, select Unlink for the PC.
   This frees a slot in your Microsoft Store device limit.

Sources:
- Microsoft: [Before you recycle, sell, or gift your Xbox or Windows PC](https://support.microsoft.com/en-us/accounts-billing/security/before-you-recycle-sell-or-gift-your-xbox-or-windows-pc) (updated: not shown on page)

## Mac (MacBook, iMac, Mac mini) (`mac`)

Applies to: laptop, desktop · About 60 minutes

### Back up what you want to keep

1. Back up your Mac or move your files to your new Mac first.
   Erasing deletes everything on the Mac.

Sources:
- Apple: [Erase your Mac and reset it to factory settings](https://support.apple.com/en-us/102664) (updated: 2026-09-14)

### Erase All Content and Settings (Apple silicon or T2 Macs)

1. This works on Apple silicon Macs and Macs with the Apple T2 chip running macOS Monterey 12 or later.
   Apple says that if you can use this feature, you don't need the older-Mac steps below.
2. Choose Apple menu > System Settings > General > Transfer or Reset > Erase All Content and Settings. **[critical]**
   Enter your Mac login password, then your Apple Account password when asked, and click Erase All Content & Settings.
3. When the setup screen appears, press and hold the power button until the Mac turns off.
   Apple says to skip setup when you are selling or giving the Mac away.

Sources:
- Apple: [Erase your Mac and reset it to factory settings](https://support.apple.com/en-us/102664) (updated: 2026-09-14)
- Apple: [What to do before you sell, give away, trade in, or recycle your Mac](https://support.apple.com/en-us/102773) (updated: not shown on page)

### Older Intel Macs (no Erase All Content and Settings)

1. Sign out of iCloud in System Settings (or System Preferences). **[critical]**
2. In Messages, open Settings > iMessage and click Sign Out.
3. Optional: unpair Bluetooth keyboards, mice or headphones you are keeping.
   If you unpair your only keyboard and mouse, plug in USB ones first.
4. Start up from macOS Recovery, erase the Mac with Disk Utility, then reinstall macOS. **[critical]**
5. When the setup assistant opens, press Command-Q to shut down instead of setting it up.
   Apple also suggests resetting NVRAM, then pressing Command-Q again.

Sources:
- Apple: [What to do before you sell, give away, trade in, or recycle your Mac](https://support.apple.com/en-us/102773) (updated: not shown on page)

### Remove it from your Apple Account

1. On another Apple device or at account.apple.com > Devices, select the Mac and choose Remove from Account.
2. Already handed it over? At icloud.com/find, select the Mac and choose Remove This Device. **[critical]**

Sources:
- Apple: [Review devices signed in to your Apple Account](https://support.apple.com/en-us/102649) (updated: not shown on page)
- Apple: [Remove a device from Find Devices on iCloud.com](https://support.apple.com/guide/icloud/remove-a-device-mmfc0eeddd/icloud) (updated: not shown on page)

## Chromebook (`chromebook`)

Applies to: laptop · About 20 minutes

### Back up what you want to keep

1. Copy files from the Downloads folder to Google Drive or a USB drive.
   A Powerwash erases all files stored on the Chromebook. Files already in Google Drive are not touched.

Sources:
- Google (Chromebook Help): [Reset your Chromebook to factory settings](https://support.google.com/chromebook/answer/183084) (updated: not shown on page)

### Powerwash (factory reset)

1. If it is a school or work Chromebook, ask the administrator to wipe it.
   Managed Chromebooks can't be reset by the user.
2. Sign out of the Chromebook.
3. Press and hold Ctrl + Alt + Shift + R, then select Restart. **[critical]**
4. In the box that appears, select Powerwash, then Continue. **[critical]**
   This deletes all user data on the Chromebook, including Downloads, settings and apps.
5. Don't sign back in after the Powerwash.
   The first Google Account that signs in becomes the owner, so leave that for the next user.

Sources:
- Google (Chromebook Help): [Reset your Chromebook to factory settings](https://support.google.com/chromebook/answer/183084) (updated: not shown on page)

### Remove it from your Google Account

1. Go to myaccount.google.com > Security & sign-in > Manage all devices, tap the Chromebook and tap Sign out.

Sources:
- Google: [See devices with account access](https://support.google.com/accounts/answer/3067630) (updated: not shown on page)

## Basic (feature) phone (`feature-phone`)

Applies to: phone · About 15 minutes

> Feature phones differ a lot. Steps follow HMD's official Nokia feature-phone guide (closest official source) and NIST's note that a factory reset is the accepted 'Clear' method for basic phones. Treat menu names as generic.

### Save what you want to keep

1. Write down or copy the contacts and messages you want to keep.
   General advice, not from an official page: a basic phone has no cloud backup.

Sources:
- HMD Global (Nokia phones): [Nokia 105 (2023) user guide: Restore factory settings](https://www.hmd.com/en_int/support/nokia-105-user-guide/restore-factory-settings) (updated: not shown on page)

### Factory reset

1. Find Restore factory settings in the Settings menu and confirm with the phone's security code. **[critical]**
   On the Nokia 105 (2023), type *#7370# on the home screen and enter the security code. HMD says this removes all data saved in the phone memory.
2. After the restart, open Contacts, Messages and the call log and check they are empty. **[critical]**
   Delete anything that is left by hand. NIST advises checking that a wipe actually worked.

Sources:
- HMD Global (Nokia phones): [Nokia 105 (2023) user guide: Restore factory settings](https://www.hmd.com/en_int/support/nokia-105-user-guide/restore-factory-settings) (updated: not shown on page)
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

### Take out the SIM and memory card

1. Switch the phone off and remove the SIM card. **[critical]**
   HMD says the reset clears data in the phone memory, so anything saved on the SIM stays on it.
2. Remove the memory card, if there is one. **[critical]**
   Keep it, or wipe it using the Loose drives guide.

Sources:
- HMD Global (Nokia phones): [Nokia 105 (2023) user guide: Restore factory settings](https://www.hmd.com/en_int/support/nokia-105-user-guide/restore-factory-settings) (updated: not shown on page)

## Loose drives: hard disk, SSD, USB stick, memory card (`storage`)

Applies to: hdd, ssd, usb, memory-card · About 60 minutes

### Three levels of wiping (NIST SP 800-88 Rev. 2)

1. Clear: erase with normal tools, such as overwriting the whole drive or a factory reset.
   Protects against simple, non-invasive recovery using the drive's normal connection.
2. Purge: use the drive's own secure-erase or sanitize command, or delete the encryption key (cryptographic erase).
   Makes recovery infeasible even with lab techniques and keeps the drive usable. NIST says to use Purge instead of Clear when possible.
3. Destroy: shred, crush to powder, melt or burn the drive so it can never be used again.
   NIST says this may be the only option when a drive has failed or is too old to connect.

Sources:
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

### Working hard disk (HDD)

1. Overwrite the whole drive once with a disk-wipe tool (Clear), or use its secure-erase command (Purge). **[critical]**
   NIST says overwriting typically stops recovery even with lab techniques; the old many-pass routines are past practice.

Sources:
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

### SSD, USB stick or memory card

1. Don't rely on overwriting or deleting files. **[critical]**
   NIST says flash storage keeps spare cells and spreads out writes, so overwriting cannot reach all old data. Degaussing also does not work on flash.
2. Use the maker's secure-erase or sanitize tool, or erase the encryption key if the drive was encrypted. **[critical]**
   This is Purge. If you can't do that, have the drive destroyed.

Sources:
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

### Dead or damaged drives

1. Don't hand over a dead drive as-is. Have it physically destroyed (shredded or pulverised). **[critical]**
   NIST says overwriting can't be used on a drive that is damaged or no longer works, so destruction may be the only option.
2. Ask your recycler for a record of what was destroyed.
   NIST includes a sample sanitization certificate with make, serial number and method.

Sources:
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

### Check your work

1. Plug the drive in after wiping and check that your old files are gone.
   NIST says checking the result is an important part of wiping.

Sources:
- NIST (US National Institute of Standards and Technology): [NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization](https://csrc.nist.gov/pubs/sp/800/88/r2/final) (updated: 2025-09 (final; supersedes Rev. 1 of 2014-12))

## UPI, WhatsApp and Find My extras (India) (`india-phone-extras`)

Applies to: phone · About 20 minutes

### Unlink your bank accounts from UPI apps

1. In Google Pay, tap your profile picture > Bank account, pick the account, tap More > Remove account. **[critical]**
   Unlink any active autopay or UPI Lite on that account first; Google Pay won't remove it otherwise.
2. Don't rely on signing out, uninstalling or resetting. **[critical]**
   Google Pay says your account and the UPI IDs you created stay active and linked to your bank after sign-out, uninstall or factory reset.
3. Repeat in every other UPI or bank app on the phone (PhonePe, Paytm, BHIM, your bank's app). **[critical]**
   General advice: menus differ per app. Check each app's help section.
4. Then sign out: Google Pay > profile picture > Settings > Sign out.
5. Take out the SIM linked to your bank account and keep it. **[critical]**
   General advice: UPI works through the mobile number registered with your bank. Google's trade-in steps also say to remove the SIM card.

Sources:
- Google: [Change or remove a bank account (Google Pay India, Android)](https://support.google.com/pay/india/answer/7296564?co=GENIE.Platform%3DAndroid) (updated: not shown on page)
- Google: [Sign out of Google Pay account (Google Pay India)](https://support.google.com/pay/india/answer/7296414) (updated: not shown on page)
- Google: [Send your trade-in device (Google Store Help)](https://support.google.com/store/answer/14282767) (updated: not shown on page)

### Back up WhatsApp

1. Android: WhatsApp > three dots > Settings > Chats > Chat backup > Back up.
   Saves to your Google Account.
2. iPhone: WhatsApp > your profile picture > Chats > Chat Backup > Back Up Now.
   Saves to iCloud. Use the same phone number to restore.

Sources:
- WhatsApp: [How to back up your chat history (Android)](https://faq.whatsapp.com/481135090640375) (updated: not shown on page)
- WhatsApp: [How to back up to iCloud](https://faq.whatsapp.com/180225246548988) (updated: not shown on page)

### Remove the phone from Find My

1. Android: removing your Google Account and factory resetting takes the phone out of Google Find Hub. **[critical]**
   Google says a reset device is no longer available in Find Hub. If you no longer have the phone, use Find Hub to factory reset it remotely.
2. iPhone: after erasing, go to icloud.com/find, select the phone and choose Remove This Device. **[critical]**
   Apple says this removes Activation Lock so the next owner can activate it.

Sources:
- Google: [Find, secure, or erase a lost Android device](https://support.google.com/accounts/answer/6160491) (updated: not shown on page)
- Apple: [Remove a device from Find Devices on iCloud.com](https://support.apple.com/guide/icloud/remove-a-device-mmfc0eeddd/icloud) (updated: not shown on page)

## Smart TV, Wi-Fi router and printer (`tv-router-printer`)

Applies to: tv, router, printer · About 20 minutes

### Smart TV or streaming box (example: Google TV)

1. Open Settings > System > About > Factory reset. **[critical]**
   Google says a factory reset erases all your data from the device. Other TV brands have a similar option; check your brand's support site.

Sources:
- Google: [Fix problems with your Google TV device](https://support.google.com/googletv/answer/10070482) (updated: not shown on page)

### Wi-Fi router (example: TP-Link)

1. With the router on, hold the Reset button for more than 10 seconds until the SYS light flashes quickly. **[critical]**
   On a combined WPS/Reset button, holding it for less than 5 seconds only starts WPS. Some routers have a pinhole that needs a pin or paperclip.
2. Or log in at tplinkwifi.net, go to Advanced > System Tools > Backup and Restore and click Factory Restore.
   This erases your Wi-Fi name and password, internet login and other settings. Keep the router powered on until it restarts.

Sources:
- TP-Link: [How to Factory Reset Your TP-Link Router](https://www.tp-link.com/us/support/faq/497/) (updated: 2026-04-17)

### Printer (example: HP LaserJet Pro)

1. On the touchscreen, open Setup > Printer Maintenance > Restore > Restore Factory Defaults. **[critical]**
   HP says this returns all printer and network settings to factory defaults and deletes pages stored in memory. Menus differ on other models.
2. Change or remove the printer's admin (EWS) password separately.
   HP says a factory reset does not reset the Embedded Web Server password.

Sources:
- HP: [HP LaserJet Pro - Restore the factory-set defaults](https://support.hp.com/us-en/document/ish_6180774-6013408-16) (updated: not checked (page timed out; content confirmed from search index of this page))

## Battery safety: swollen or damaged lithium batteries

1. Stop using a battery that is swollen, hot, leaking, smelly, discoloured or has changed shape. **[critical]**
   US EPA says swelling means the battery is damaged and is a fire hazard.
2. Don't charge it or switch the device on. **[critical]**
   The US Fire Administration says to stop using a battery that shows these signs.
3. Don't press, bend, puncture or try to open it. **[critical]**
   EPA warns that damaged or crushed lithium batteries can start fires.
4. Cover the metal terminals with electrical tape and put each battery or device in its own plastic bag. **[critical]**
5. Keep it out of sunlight and hot places, away from anything that can burn. **[critical]**
   EPA suggests storing a swollen battery in a container of sand or somewhere away from flammable things until you can hand it over.
6. Never put it in the household dustbin or dry-waste bag. Give it to an e-waste collector or recycler. **[critical]**
   For a damaged battery, EPA advises asking the device maker or seller how to handle it.
7. If it smokes or catches fire, move away and call emergency services.
   US EPA says to call emergency services if there is an immediate fire risk.

Sources:
- US EPA: [Used Lithium-Ion Batteries](https://www.epa.gov/recycle/used-lithium-ion-batteries) (updated: 2026-03-20)
- US EPA: [Frequent Questions on Lithium-Ion Batteries](https://www.epa.gov/recycle/frequent-questions-lithium-ion-batteries) (updated: 2026-04-14)
- US Fire Administration (FEMA): [Battery Fire Safety](https://www.usfa.fema.gov/prevention/home-fires/prevent-fires/batteries/) (updated: 2024-11-07 (last reviewed))

## Gaps and caveats

- **Generic, not from an official page:** feature-phone contact/message copying; taking out a physical SIM on iPhone; repeating UPI unlinking in PhonePe, Paytm, BHIM and bank apps (only Google Pay's help was read). NPCI's UPI FAQ (npci.org.in) and BHIM FAQ (bhimupi.org.in) did not load, so no NPCI page is cited.
- **Samsung eSIM:** no official Samsung page on erasing an eSIM was found; the step uses Google's generic 'erase any downloaded SIMs' advice.
- **HP printer page** (support.hp.com) timed out on direct fetch; its wording was confirmed from the search index of that official page.
- **Battery 'don't puncture':** EPA and USFA pages say damaged/crushed batteries are a fire risk and to stop using them; neither states 'do not puncture' or 'do not charge a swollen battery' word for word. The FAA advisory that does was blocked (403).
- **Android encryption:** Google's AOSP page says new devices launching with Android 10+ must use file-based encryption (full-disk encryption is not allowed). Phones that launched on older Android and were upgraded may differ.
- **Windows Clean data:** Microsoft says it does not meet government or industry erasure standards.
- Samsung's Smart Switch page is from Samsung UK (no India equivalent found); the app is the same.

## All sources (34)

- Google: Back up or restore data on your Android device <https://support.google.com/android/answer/2819582>
- WhatsApp: How to back up your chat history (Android) <https://faq.whatsapp.com/481135090640375>
- Google: Reset your Android device to factory settings <https://support.google.com/android/answer/6088915>
- Google: Encryption (Android Open Source Project) <https://source.android.com/docs/security/features/encryption>
- Google: Add or remove an account on Android <https://support.google.com/android/answer/7664951>
- Google: Help prevent others from using your device without permission (Pixel Phone Help) <https://support.google.com/pixelphone/answer/6172890>
- Google: How to use dual SIMs on your Google Pixel phone <https://support.google.com/pixelphone/answer/9449293>
- Google: Send your trade-in device (Google Store Help) <https://support.google.com/store/answer/14282767>
- Google: Find, secure, or erase a lost Android device <https://support.google.com/accounts/answer/6160491>
- Google: See devices with account access <https://support.google.com/accounts/answer/3067630>
- Samsung UK: How to backup your Samsung phone to PC or Mac <https://www.samsung.com/uk/support/mobile-devices/how-do-i-backup-my-smartphone-to-my-pc-or-mac/>
- Samsung India: Remove accounts from your Galaxy phone or tablet <https://www.samsung.com/in/support/mobile-devices/remove-accounts-from-your-galaxy-phone-or-tablet/>
- Samsung India: How to perform a factory reset on your Samsung Galaxy device <https://www.samsung.com/in/support/mobile-devices/perform-a-factory-reset-on-samsung-galaxy-device/>
- Apple: What to do before you sell, give away, or trade in your iPhone or iPad <https://support.apple.com/en-us/109511>
- WhatsApp: How to back up to iCloud <https://faq.whatsapp.com/180225246548988>
- Apple: Unpair and erase your Apple Watch <https://support.apple.com/en-us/108372>
- Apple: Review devices signed in to your Apple Account <https://support.apple.com/en-us/102649>
- Apple: Remove a device from Find Devices on iCloud.com <https://support.apple.com/guide/icloud/remove-a-device-mmfc0eeddd/icloud>
- Microsoft: Before you recycle, sell, or gift your Xbox or Windows PC <https://support.microsoft.com/en-us/accounts-billing/security/before-you-recycle-sell-or-gift-your-xbox-or-windows-pc>
- Microsoft: Device Encryption in Windows <https://support.microsoft.com/en-us/windows/device-encryption-in-windows-cf7e2b6f-3e70-4882-9532-18633605b7df>
- Microsoft: Reset your PC <https://support.microsoft.com/en-us/windows/reset-your-pc-0ef73740-b927-549b-b7c9-e6f2b48d275e>
- Apple: Erase your Mac and reset it to factory settings <https://support.apple.com/en-us/102664>
- Apple: What to do before you sell, give away, trade in, or recycle your Mac <https://support.apple.com/en-us/102773>
- Google (Chromebook Help): Reset your Chromebook to factory settings <https://support.google.com/chromebook/answer/183084>
- HMD Global (Nokia phones): Nokia 105 (2023) user guide: Restore factory settings <https://www.hmd.com/en_int/support/nokia-105-user-guide/restore-factory-settings>
- NIST (US National Institute of Standards and Technology): NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization <https://csrc.nist.gov/pubs/sp/800/88/r2/final>
- Google: Change or remove a bank account (Google Pay India, Android) <https://support.google.com/pay/india/answer/7296564?co=GENIE.Platform%3DAndroid>
- Google: Sign out of Google Pay account (Google Pay India) <https://support.google.com/pay/india/answer/7296414>
- Google: Fix problems with your Google TV device <https://support.google.com/googletv/answer/10070482>
- TP-Link: How to Factory Reset Your TP-Link Router <https://www.tp-link.com/us/support/faq/497/>
- HP: HP LaserJet Pro - Restore the factory-set defaults <https://support.hp.com/us-en/document/ish_6180774-6013408-16>
- US EPA: Used Lithium-Ion Batteries <https://www.epa.gov/recycle/used-lithium-ion-batteries>
- US EPA: Frequent Questions on Lithium-Ion Batteries <https://www.epa.gov/recycle/frequent-questions-lithium-ion-batteries>
- US Fire Administration (FEMA): Battery Fire Safety <https://www.usfa.fema.gov/prevention/home-fires/prevent-fires/batteries/>

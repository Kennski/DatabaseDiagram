# ALDCISTEST Database - All 77 CREATE TABLE Definitions

---

## Table 1: `__efmigrationshistory`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `MigrationId` | varchar(150) | NOT NULL |
| `ProductVersion` | varchar(32) | NOT NULL |

**PRIMARY KEY:** (`MigrationId`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 2: `adini`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ClinicId` | int(11) | NOT NULL |
| `ClinicNr` | longtext | DEFAULT NULL |
| `VarName` | longtext | DEFAULT NULL |
| `VarValue` | longtext | DEFAULT NULL |
| `Syncron` | datetime(6) | DEFAULT NULL |
| `AddedAt` | datetime(6) | NOT NULL DEFAULT current_timestamp(6) |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Adini_ClinicId` (`ClinicId`)

**Foreign Keys:**
- `FK_Adini_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE

---

## Table 3: `aggregatedcounter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | int(11) | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_CounterAggregated_Key` (`Key`)

**Foreign Keys:** None

---

## Table 4: `aspnetroles`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | varchar(255) | NOT NULL |
| `Description` | longtext | DEFAULT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `Name` | varchar(256) | DEFAULT NULL |
| `NormalizedName` | varchar(256) | DEFAULT NULL |
| `ConcurrencyStamp` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `RoleNameIndex` (`NormalizedName`)

**Foreign Keys:** None

---

## Table 5: `aspnetusers`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | varchar(255) | NOT NULL |
| `FirstName` | varchar(64) | DEFAULT NULL |
| `LastName` | varchar(64) | DEFAULT NULL |
| `UserIdentifier` | char(36) CHARACTER SET ascii | NOT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `UserName` | varchar(256) | DEFAULT NULL |
| `NormalizedUserName` | varchar(256) | DEFAULT NULL |
| `Email` | varchar(256) | DEFAULT NULL |
| `NormalizedEmail` | varchar(256) | DEFAULT NULL |
| `EmailConfirmed` | tinyint(1) | NOT NULL |
| `PasswordHash` | longtext | DEFAULT NULL |
| `SecurityStamp` | longtext | DEFAULT NULL |
| `ConcurrencyStamp` | longtext | DEFAULT NULL |
| `PhoneNumber` | longtext | DEFAULT NULL |
| `PhoneNumberConfirmed` | tinyint(1) | NOT NULL |
| `TwoFactorEnabled` | tinyint(1) | NOT NULL |
| `LockoutEnd` | datetime(6) | DEFAULT NULL |
| `LockoutEnabled` | tinyint(1) | NOT NULL |
| `AccessFailedCount` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `UserNameIndex` (`NormalizedUserName`)
- KEY `EmailIndex` (`NormalizedEmail`)

**Foreign Keys:** None

---

## Table 6: `assets`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `UserId` | int(11) | NOT NULL |
| `ApplicationUser` | longtext | DEFAULT NULL |
| `Size` | longtext | DEFAULT NULL |
| `Extension` | longtext | DEFAULT NULL |
| `Hash` | longtext | DEFAULT NULL |
| `Checksum` | longtext | DEFAULT NULL |
| `Mimetype` | longtext | DEFAULT NULL |
| `Basename` | longtext | DEFAULT NULL |
| `Name` | longtext | DEFAULT NULL |
| `OriginalBasename` | longtext | DEFAULT NULL |
| `OriginalName` | longtext | DEFAULT NULL |
| `Type` | longtext | DEFAULT NULL |
| `StoragePath` | longtext | DEFAULT NULL |
| `FullPath` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 7: `audittrails`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `UserId` | longtext | DEFAULT NULL |
| `Type` | longtext | DEFAULT NULL |
| `TableName` | longtext | DEFAULT NULL |
| `DateTime` | datetime(6) | NOT NULL |
| `OldValues` | longtext | DEFAULT NULL |
| `NewValues` | longtext | DEFAULT NULL |
| `AffectedColumns` | longtext | DEFAULT NULL |
| `PrimaryKey` | longtext | DEFAULT NULL |
| `ClinicId` | int(11) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 8: `backupreports`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `ServiceAccountId` | int(11) | NOT NULL DEFAULT 0 |
| `Success` | tinyint(1) | NOT NULL |
| `ClinicId` | int(11) | NOT NULL DEFAULT 0 |
| `EndOfLog` | tinyint(1) | NOT NULL |
| `Error` | longtext | DEFAULT NULL |
| `StartTime` | datetime(6) | NOT NULL |
| `EndTime` | datetime(6) | DEFAULT NULL |
| `Machine` | longtext | DEFAULT NULL |
| `Folder` | longtext | DEFAULT NULL |
| `DriveMbFree` | bigint(20) | NOT NULL |
| `Processor` | longtext | DEFAULT NULL |
| `OperatingSystem` | longtext | DEFAULT NULL |
| `Server` | longtext | DEFAULT NULL |
| `Port` | longtext | DEFAULT NULL |
| `MasterLog` | longtext | DEFAULT NULL |
| `MasterLogPos` | bigint(20) | NOT NULL |
| `SlaveIOState` | longtext | DEFAULT NULL |
| `SlaveMasterLog` | longtext | DEFAULT NULL |
| `SlaveMasterLogPos` | bigint(20) | NOT NULL |
| `SlaveIORun` | longtext | DEFAULT NULL |
| `SlaveSQLRun` | longtext | DEFAULT NULL |
| `SlaveLastError` | longtext | DEFAULT NULL |
| `Type` | int(11) | NOT NULL |
| `Database` | longtext | DEFAULT NULL |
| `Growth` | bigint(20) | NOT NULL |
| `LastZip` | longtext | DEFAULT NULL |
| `ZipSize` | bigint(20) | NOT NULL |
| `ZipName` | longtext | DEFAULT NULL |
| `IsFixed` | tinyint(1) | NOT NULL DEFAULT 0 |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_BackupReports_ClinicId` (`ClinicId`)
- KEY `IX_BackupReports_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_BackupReports_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_BackupReports_ServiceAccounts_ServiceAccountId`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 9: `backupserverinstances`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceAccountId` | int(11) | NOT NULL |
| `LastReplicaHealthReport` | datetime(6) | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `SlaveIORun` | longtext | DEFAULT NULL |
| `SlaveIOState` | longtext | DEFAULT NULL |
| `SlaveLastError` | longtext | DEFAULT NULL |
| `SlaveMasterLog` | longtext | DEFAULT NULL |
| `SlaveMasterLogPos` | bigint(20) | NOT NULL DEFAULT 0 |
| `SlaveSQLRun` | longtext | DEFAULT NULL |
| `SlaveSqlRunningState` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_BackupServerInstances_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_BackupServerInstances_ServiceAccounts_ServiceAccountId`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 10: `backupservermanagementservicestatuses`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceAccountId` | int(11) | NOT NULL |
| `LastMessage` | longtext | DEFAULT NULL |
| `Status` | longtext | DEFAULT NULL |
| `WorkingJob` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_BackupServerManagementServiceStatuses_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_BackupServerManagementServiceStatuses_ServiceAccounts_Servic~`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 11: `backupstatuses`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceAccountId` | int(11) | NOT NULL |
| `ClinicId` | int(11) | NOT NULL |
| `LastPrimaryGood` | tinyint(1) | NOT NULL |
| `LastPrimaryTime` | datetime(6) | DEFAULT NULL |
| `LastReplicaGood` | tinyint(1) | NOT NULL |
| `LastReplicaTime` | datetime(6) | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `LatestCheckDate` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_BackupStatuses_ClinicId` (`ClinicId`)
- KEY `IX_BackupStatuses_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_BackupStatuses_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_BackupStatuses_ServiceAccounts_ServiceAccountId`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 12: `clinicgroup`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `ClinicId` | int(11) | NOT NULL |
| `GroupId` | int(11) | NOT NULL |
| `CreateAt` | datetime(6) | DEFAULT curdate() |

**PRIMARY KEY:** (`ClinicId`, `GroupId`)

**Indexes:**
- KEY `IX_ClinicGroup_GroupId` (`GroupId`)

**Foreign Keys:**
- `FK_ClinicGroup_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicGroup_Groups_GroupId`: (`GroupId`) → `groups`(`Id`) ON DELETE CASCADE

---

## Table 13: `clinicmanualservice`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `ClinicsId` | int(11) | NOT NULL |
| `ManualServicesId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`ClinicsId`, `ManualServicesId`)

**Indexes:**
- KEY `IX_ClinicManualService_ManualServicesId` (`ManualServicesId`)

**Foreign Keys:**
- `FK_ClinicManualService_Clinics_ClinicsId`: (`ClinicsId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicManualService_ManualServices_ManualServicesId`: (`ManualServicesId`) → `manualservices`(`Id`) ON DELETE CASCADE

---

## Table 14: `clinicmodule`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `ClinicsId` | int(11) | NOT NULL |
| `ModulesId` | int(11) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT curdate() |
| `Active` | tinyint(1) | NOT NULL DEFAULT 1 |
| `UpdatedAt` | datetime(6) | DEFAULT current_timestamp(6) |

**PRIMARY KEY:** (`ClinicsId`, `ModulesId`)

**Indexes:**
- KEY `IX_ClinicModule_ModulesId` (`ModulesId`)

**Foreign Keys:**
- `FK_ClinicModule_Clinics_ClinicsId`: (`ClinicsId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicModule_Modules_ModulesId`: (`ModulesId`) → `modules`(`Id`) ON DELETE CASCADE

---

## Table 15: `clinics`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `CustomerId` | int(11) | NOT NULL |
| `Name` | longtext | DEFAULT NULL |
| `AddressStreet` | longtext | DEFAULT NULL |
| `AddressCity` | longtext | DEFAULT NULL |
| `AddressZip` | longtext | DEFAULT NULL |
| `Licences` | int(11) | NOT NULL |
| `Cvr` | longtext | DEFAULT NULL |
| `RegisteredVersion` | longtext | DEFAULT NULL |
| `IdentificationCodes` | longtext | DEFAULT NULL |
| `Phone` | longtext | DEFAULT NULL |
| `Email` | longtext | DEFAULT NULL |
| `Ip` | longtext | DEFAULT NULL |
| `Extra` | longtext | DEFAULT NULL |
| `Note` | longtext | DEFAULT NULL |
| `Ban` | tinyint(1) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `Active` | tinyint(1) | DEFAULT NULL |
| `NoteColor` | int(11) | DEFAULT NULL |
| `LicenseKey` | longtext | DEFAULT NULL |
| `Moces2` | int(11) | NOT NULL DEFAULT 0 |
| `Moces3` | int(11) | NOT NULL DEFAULT 0 |
| `ConnectWiseAccess` | tinyint(1) | NOT NULL DEFAULT 1 |
| `CanUploadDataSecurity` | tinyint(1) | NOT NULL DEFAULT 1 |
| `ActivityChangedBy` | longtext | DEFAULT NULL |
| `ActivityLastChanged` | datetime(6) | DEFAULT NULL |
| `ActivityNotes` | longtext | DEFAULT NULL |
| `IsDeactivated` | tinyint(1) | NOT NULL DEFAULT 0 |
| `FinanceBackupActive` | tinyint(1) | NOT NULL DEFAULT 1 |
| `FinanceCron` | varchar(25) | DEFAULT '0 23 * * *' |
| `DanmarkAPIToken` | longtext | DEFAULT NULL |
| `DanmarkAPITokenTest` | longtext | DEFAULT NULL |
| `DanmarkAPITokenURL` | longtext | DEFAULT NULL |
| `DanmarkAPITokenURLTest` | longtext | DEFAULT NULL |
| `SenderID` | longtext | DEFAULT NULL |
| `BcCustomerStopDate` | datetime(6) | DEFAULT NULL |
| `BcCustomerStopped` | tinyint(1) | NOT NULL DEFAULT 0 |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 16: `clinicservercomments`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Text` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `ClinicServerId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ClinicServerComments_ClinicServerId` (`ClinicServerId`)

**Foreign Keys:**
- `FK_ClinicServerComments_ClinicServerManagementServiceStatuses_C~`: (`ClinicServerId`) → `clinicservermanagementservicestatuses`(`Id`) ON DELETE CASCADE

---

## Table 17: `clinicservermanagementservicestatuses`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceAccountId` | int(11) | NOT NULL |
| `LastMessage` | longtext | DEFAULT NULL |
| `Status` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `WorkingJob` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ClinicServerManagementServiceStatuses_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_ClinicServerManagementServiceStatuses_ServiceAccounts_Servic~`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 18: `clinicservice`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ClinicId` | int(11) | NOT NULL |
| `ServiceId` | int(11) | NOT NULL |
| `Ban` | tinyint(1) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ClinicService_ClinicId` (`ClinicId`)
- KEY `IX_ClinicService_ServiceId` (`ServiceId`)

**Foreign Keys:**
- `FK_ClinicService_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicService_Services_ServiceId`: (`ServiceId`) → `services`(`Id`) ON DELETE CASCADE

---

## Table 19: `clinicserviceaccount`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `ClinicsId` | int(11) | NOT NULL |
| `ServiceAccountsId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`ClinicsId`, `ServiceAccountsId`)

**Indexes:**
- KEY `IX_ClinicServiceAccount_ServiceAccountsId` (`ServiceAccountsId`)

**Foreign Keys:**
- `FK_ClinicServiceAccount_Clinics_ClinicsId`: (`ClinicsId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicServiceAccount_ServiceAccounts_ServiceAccountsId`: (`ServiceAccountsId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 20: `clinicvariablegroups`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ClinicId` | int(11) | NOT NULL |
| `VariableGroupId` | int(11) | NOT NULL |
| `Description` | varchar(1024) | DEFAULT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `Variables` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_ClinicVariableGroups_ClinicId_VariableGroupId` (`ClinicId`, `VariableGroupId`)
- KEY `IX_ClinicVariableGroups_VariableGroupId` (`VariableGroupId`)

**Foreign Keys:**
- `FK_ClinicVariableGroups_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE
- `FK_ClinicVariableGroups_VariableGroups_VariableGroupId`: (`VariableGroupId`) → `variablegroups`(`Id`) ON DELETE CASCADE

---

## Table 21: `computerprograms`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Program` | longtext | DEFAULT NULL |
| `Version` | longtext | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | NOT NULL |
| `ComputerId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ComputerPrograms_ComputerId` (`ComputerId`)

**Foreign Keys:**
- `FK_ComputerPrograms_Computers_ComputerId`: (`ComputerId`) → `computers`(`Id`) ON DELETE CASCADE

---

## Table 22: `computers`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `WAN` | longtext | DEFAULT NULL |
| `Os` | longtext | DEFAULT NULL |
| `Name` | longtext | DEFAULT NULL |
| `Workspace` | int(11) | NOT NULL |
| `LAN` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `ClinicId` | int(11) | NOT NULL DEFAULT 0 |
| `AdVersion` | longtext | DEFAULT NULL |
| `LastUpdated` | datetime(6) | NOT NULL DEFAULT '0001-01-01 00:00:00.000000' |
| `LatestStart` | datetime(6) | NOT NULL DEFAULT '0001-01-01 00:00:00.000000' |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Computers_ClinicId` (`ClinicId`)

**Foreign Keys:**
- `FK_Computers_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE

---

## Table 23: `computersoftwareproduct`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ComputerId` | int(11) | NOT NULL |
| `KategoriId` | int(11) | NOT NULL |
| `Version` | longtext | DEFAULT NULL |
| `DotnetVersion` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `DeletedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ComputerSoftwareProduct_ComputerId` (`ComputerId`)
- KEY `IX_ComputerSoftwareProduct_KategoriId` (`KategoriId`)

**Foreign Keys:**
- `FK_ComputerSoftwareProduct_Computers_ComputerId`: (`ComputerId`) → `computers`(`Id`) ON DELETE CASCADE
- `FK_ComputerSoftwareProduct_SoftwareCategories_KategoriId`: (`KategoriId`) → `softwarecategories`(`Id`) ON DELETE CASCADE

---

## Table 24: `computerstartups`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `WorkPlace` | longtext | DEFAULT NULL |
| `Date` | datetime(6) | DEFAULT NULL |
| `CustomerNumber` | longtext | DEFAULT NULL |
| `Status` | longtext | DEFAULT NULL |
| `ComputerName` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 25: `counter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | int(11) | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Counter_Key` (`Key`)

**Foreign Keys:** None

---

## Table 26: `danmarkapi`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Token` | longtext | DEFAULT NULL |
| `TestToken` | longtext | DEFAULT NULL |
| `URL` | longtext | DEFAULT NULL |
| `TestURL` | longtext | DEFAULT NULL |
| `SenderID` | longtext | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6) |
| `CreatedAt` | datetime(6) | NOT NULL DEFAULT current_timestamp(6) |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 27: `danmarkapilog`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Type` | longtext | DEFAULT NULL |
| `Token` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | NOT NULL DEFAULT current_timestamp(6) |
| `Contributer` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 28: `datareplicationservicecomments`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `DataReplicationServiceStatusId` | int(11) | NOT NULL |
| `Text` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `ClinicServerId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_DataReplicationServiceComments_DataReplicationServiceStatusId` (`DataReplicationServiceStatusId`)

**Foreign Keys:**
- `FK_DataReplicationServiceComments_DataReplicationServiceStatuse~`: (`DataReplicationServiceStatusId`) → `datareplicationservicestatuses`(`Id`) ON DELETE CASCADE

---

## Table 29: `datareplicationservicestatuses`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceAccountId` | int(11) | NOT NULL |
| `LastMessage` | longtext | DEFAULT NULL |
| `Status` | longtext | DEFAULT NULL |
| `WorkingJob` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_DataReplicationServiceStatuses_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_DataReplicationServiceStatuses_ServiceAccounts_ServiceAccoun~`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 30: `digisenseconsumptions`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Date` | date | DEFAULT NULL |
| `CVR` | longtext | DEFAULT NULL |
| `ClinicNumber` | longtext | DEFAULT NULL |
| `Amount` | int(11) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Table Comment:** `Digisense forbrug`

**Indexes:** None

**Foreign Keys:** None

---

## Table 31: `digisensesettlements`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ClinicId` | int(11) | NOT NULL |
| `CustomerId` | longtext | DEFAULT NULL |
| `Quantity` | int(11) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `CustomerSyncron` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_DigisenseSettlements_ClinicId` (`ClinicId`)

**Foreign Keys:**
- `FK_DigisenseSettlements_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE

---

## Table 32: `distributedlock`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Resource` | varchar(100) | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |

**PRIMARY KEY:** None

**Indexes:** None

**Foreign Keys:** None

---

## Table 33: `downloads`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `UserId` | int(11) | DEFAULT NULL |
| `AssetId` | int(11) | DEFAULT NULL |
| `Source` | longtext | DEFAULT NULL |
| `Url` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Downloads_AssetId` (`AssetId`)

**Foreign Keys:**
- `FK_Downloads_Assets_AssetId`: (`AssetId`) → `assets`(`Id`)

---

## Table 34: `financetables`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Tables` | longtext | DEFAULT NULL |
| `LastUpdated` | datetime(6) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 35: `ftpsettings`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `HostName` | longtext | DEFAULT NULL |
| `UserName` | longtext | DEFAULT NULL |
| `Password` | longtext | DEFAULT NULL |
| `Port` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 36: `groups`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 37: `groupsoftwarepatch`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `GroupsId` | int(11) | NOT NULL |
| `SoftwarePatchesId` | int(11) | NOT NULL |
| `ReleaseDate` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`GroupsId`, `SoftwarePatchesId`)

**Indexes:**
- KEY `IX_GroupSoftwarePatch_SoftwarePatchesId` (`SoftwarePatchesId`)

**Foreign Keys:**
- `FK_GroupSoftwarePatch_Groups_GroupsId`: (`GroupsId`) → `groups`(`Id`) ON DELETE CASCADE
- `FK_GroupSoftwarePatch_SoftwareVersionPatches_SoftwarePatchesId`: (`SoftwarePatchesId`) → `softwareversionpatches`(`Id`) ON DELETE CASCADE

---

## Table 38: `groupsoftwareversion`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `GroupsId` | int(11) | NOT NULL |
| `SoftwareVersionsId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`GroupsId`, `SoftwareVersionsId`)

**Indexes:**
- KEY `IX_GroupSoftwareVersion_SoftwareVersionsId` (`SoftwareVersionsId`)

**Foreign Keys:**
- `FK_GroupSoftwareVersion_Groups_GroupsId`: (`GroupsId`) → `groups`(`Id`) ON DELETE CASCADE
- `FK_GroupSoftwareVersion_SoftwareVersions_SoftwareVersionsId`: (`SoftwareVersionsId`) → `softwareversions`(`Id`) ON DELETE CASCADE

---

## Table 39: `hangfireaggregatedcounter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | int(11) | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_HangfireCounterAggregated_Key` (`Key`)

**Foreign Keys:** None

---

## Table 40: `hangfirecounter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | int(11) | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_HangfireCounter_Key` (`Key`)

**Foreign Keys:** None

---

## Table 41: `hangfiredistributedlock`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Resource` | varchar(100) | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |

**PRIMARY KEY:** None

**Indexes:** None

**Foreign Keys:** None

---

## Table 42: `hangfirehash`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Field` | varchar(40) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |
| `ExpireAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_HangfireHash_Key_Field` (`Key`, `Field`)

**Foreign Keys:** None

---

## Table 43: `hangfirejob`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `StateId` | int(11) | DEFAULT NULL |
| `StateName` | varchar(20) | DEFAULT NULL |
| `InvocationData` | longtext | NOT NULL |
| `Arguments` | longtext | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `ExpireAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_HangfireJob_StateName` (`StateName`)

**Foreign Keys:** None

---

## Table 44: `hangfirejobparameter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `Name` | varchar(40) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_HangfireJobParameter_JobId_Name` (`JobId`, `Name`)
- KEY `FK_HangfireJobParameter_Job` (`JobId`)

**Foreign Keys:**
- `FK_HangfireJobParameter_Job`: (`JobId`) → `hangfirejob`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 45: `hangfirejobqueue`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `FetchedAt` | datetime(6) | DEFAULT NULL |
| `Queue` | varchar(50) | NOT NULL |
| `FetchToken` | varchar(36) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_HangfireJobQueue_QueueAndFetchedAt` (`Queue`, `FetchedAt`)

**Foreign Keys:** None

---

## Table 46: `hangfirejobstate`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `Name` | varchar(20) | NOT NULL |
| `Reason` | varchar(100) | DEFAULT NULL |
| `Data` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `FK_HangfireJobState_Job` (`JobId`)

**Foreign Keys:**
- `FK_HangfireJobState_Job`: (`JobId`) → `hangfirejob`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 47: `hangfireserver`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | varchar(100) | NOT NULL |
| `Data` | longtext | NOT NULL |
| `LastHeartbeat` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 48: `hangfireset`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | varchar(256) | NOT NULL |
| `Score` | float | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_HangfireSet_Key_Value` (`Key`, `Value`)

**Foreign Keys:** None

---

## Table 49: `hangfirestate`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `Name` | varchar(20) | NOT NULL |
| `Reason` | varchar(100) | DEFAULT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `Data` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `FK_HangfireHangFire_State_Job` (`JobId`)

**Foreign Keys:**
- `FK_HangfireHangFire_State_Job`: (`JobId`) → `hangfirejob`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 50: `hash`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Field` | varchar(40) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |
| `ExpireAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_Hash_Key_Field` (`Key`, `Field`)

**Foreign Keys:** None

---

## Table 51: `job`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `StateId` | int(11) | DEFAULT NULL |
| `StateName` | varchar(20) | DEFAULT NULL |
| `InvocationData` | longtext | NOT NULL |
| `Arguments` | longtext | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `ExpireAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Job_StateName` (`StateName`)

**Foreign Keys:** None

---

## Table 52: `jobparameter`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `Name` | varchar(40) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_JobParameter_JobId_Name` (`JobId`, `Name`)
- KEY `FK_JobParameter_Job` (`JobId`)

**Foreign Keys:**
- `FK_JobParameter_Job`: (`JobId`) → `job`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 53: `jobqueue`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `FetchedAt` | datetime(6) | DEFAULT NULL |
| `Queue` | varchar(50) | NOT NULL |
| `FetchToken` | varchar(36) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_JobQueue_QueueAndFetchedAt` (`Queue`, `FetchedAt`)

**Foreign Keys:** None

---

## Table 54: `jobstate`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `Name` | varchar(20) | NOT NULL |
| `Reason` | varchar(100) | DEFAULT NULL |
| `Data` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `FK_JobState_Job` (`JobId`)

**Foreign Keys:**
- `FK_JobState_Job`: (`JobId`) → `job`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 55: `licens`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ClinicId` | int(11) | NOT NULL |
| `Modules` | longtext | DEFAULT NULL |
| `LicensNumber` | longtext | DEFAULT NULL |
| `Ydernumre` | longtext | DEFAULT NULL |
| `Workplaces` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT curdate() |
| `UpdatedAt` | datetime(6) | DEFAULT current_timestamp(6) |
| `CustomerNumber` | longtext | DEFAULT NULL |
| `LicensName` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_Licens_ClinicId` (`ClinicId`)

**Foreign Keys:**
- `FK_Licens_Clinics_ClinicId`: (`ClinicId`) → `clinics`(`Id`) ON DELETE CASCADE

---

## Table 56: `list`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |
| `ExpireAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 57: `manualservices`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 58: `modules`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 59: `mydocuments`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `CustomerId` | int(11) | NOT NULL |
| `FileAmountShared` | int(11) | NOT NULL |
| `Month` | int(11) | NOT NULL |
| `Year` | int(11) | NOT NULL |
| `MonthYearKey` | int(11) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 60: `mysqlbackuplogs`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Klinik` | longtext | DEFAULT NULL |
| `Ydernr` | longtext | DEFAULT NULL |
| `Telefon` | longtext | DEFAULT NULL |
| `Error` | longtext | DEFAULT NULL |
| `StartTime` | datetime(6) | NOT NULL |
| `Machine` | longtext | DEFAULT NULL |
| `Folder` | longtext | DEFAULT NULL |
| `DriveMbFree` | longtext | DEFAULT NULL |
| `MemoryMbFree` | longtext | DEFAULT NULL |
| `MemoryMbInstalled` | longtext | DEFAULT NULL |
| `Processor` | longtext | DEFAULT NULL |
| `Os` | longtext | DEFAULT NULL |
| `Server` | longtext | DEFAULT NULL |
| `Port` | longtext | DEFAULT NULL |
| `Type` | longtext | DEFAULT NULL |
| `MasterLog` | longtext | DEFAULT NULL |
| `MasterLogPos` | longtext | DEFAULT NULL |
| `SlaveIostate` | longtext | DEFAULT NULL |
| `SlaveMasterLog` | longtext | DEFAULT NULL |
| `SlaveMasterLogPos` | longtext | DEFAULT NULL |
| `SlaveIorun` | longtext | DEFAULT NULL |
| `SlaveSqlrun` | longtext | DEFAULT NULL |
| `Db` | longtext | DEFAULT NULL |
| `Completed` | longtext | DEFAULT NULL |
| `Zip` | longtext | DEFAULT NULL |
| `Growth` | longtext | DEFAULT NULL |
| `LastZip` | longtext | DEFAULT NULL |
| `EndTime` | datetime(6) | NOT NULL |
| `Status` | longtext | DEFAULT NULL |
| `Autotime` | datetime(6) | NOT NULL |
| `ErrorCorrected` | longtext | DEFAULT NULL |
| `Alsecure` | longtext | DEFAULT NULL |
| `Opt` | longtext | DEFAULT NULL |
| `Slavelasterror` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 61: `roleclaims`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Description` | longtext | DEFAULT NULL |
| `Group` | longtext | DEFAULT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `RoleId` | varchar(255) | NOT NULL |
| `ClaimType` | longtext | DEFAULT NULL |
| `ClaimValue` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_RoleClaims_RoleId` (`RoleId`)

**Foreign Keys:**
- `FK_RoleClaims_AspNetRoles_RoleId`: (`RoleId`) → `aspnetroles`(`Id`) ON DELETE CASCADE

---

## Table 62: `server`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | varchar(100) | NOT NULL |
| `Data` | longtext | NOT NULL |
| `LastHeartbeat` | datetime(6) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 63: `serviceaccounts`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `ServiceIdentityToken` | longtext | DEFAULT NULL |
| `AuthToken` | longtext | DEFAULT NULL |
| `ServiceId` | int(11) | NOT NULL |
| `ServiceIdentity` | char(36) CHARACTER SET ascii | NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' |
| `NotReplicaAccess` | tinyint(1) | NOT NULL DEFAULT 0 |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_ServiceAccounts_ServiceId` (`ServiceId`)

**Foreign Keys:**
- `FK_ServiceAccounts_Services_ServiceId`: (`ServiceId`) → `services`(`Id`) ON DELETE CASCADE

---

## Table 64: `services`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `ServiceIdentity` | char(36) CHARACTER SET ascii | NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 65: `set`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Key` | varchar(100) | NOT NULL |
| `Value` | varchar(256) | NOT NULL |
| `Score` | float | NOT NULL |
| `ExpireAt` | datetime | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- UNIQUE KEY `IX_Set_Key_Value` (`Key`, `Value`)

**Foreign Keys:** None

---

## Table 66: `softwarecategories`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `Slug` | longtext | DEFAULT NULL |
| `Patchreq` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 67: `softwarecategoryvariablegroup`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `SoftwareCategoriesId` | int(11) | NOT NULL |
| `VariableGroupsId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`SoftwareCategoriesId`, `VariableGroupsId`)

**Indexes:**
- KEY `IX_SoftwareCategoryVariableGroup_VariableGroupsId` (`VariableGroupsId`)

**Foreign Keys:**
- `FK_SoftwareCategoryVariableGroup_SoftwareCategories_SoftwareCat~`: (`SoftwareCategoriesId`) → `softwarecategories`(`Id`) ON DELETE CASCADE
- `FK_SoftwareCategoryVariableGroup_VariableGroups_VariableGroupsId`: (`VariableGroupsId`) → `variablegroups`(`Id`) ON DELETE CASCADE

---

## Table 68: `softwareversionpatches`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `SoftwareVersionId` | int(11) | NOT NULL |
| `Number` | longtext | DEFAULT NULL |
| `Name` | longtext | DEFAULT NULL |
| `File` | longtext | DEFAULT NULL |
| `Hash` | longtext | DEFAULT NULL |
| `Release` | tinyint(1) | NOT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `AssetId` | int(11) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_SoftwareVersionPatches_AssetId` (`AssetId`)
- KEY `IX_SoftwareVersionPatches_SoftwareVersionId` (`SoftwareVersionId`)

**Foreign Keys:**
- `FK_SoftwareVersionPatches_Assets_AssetId`: (`AssetId`) → `assets`(`Id`)
- `FK_SoftwareVersionPatches_SoftwareVersions_SoftwareVersionId`: (`SoftwareVersionId`) → `softwareversions`(`Id`) ON DELETE CASCADE

---

## Table 69: `softwareversions`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Number` | longtext | DEFAULT NULL |
| `Name` | longtext | DEFAULT NULL |
| `File` | longtext | DEFAULT NULL |
| `Hash` | longtext | DEFAULT NULL |
| `CreatedAt` | datetime(6) | DEFAULT NULL |
| `UpdatedAt` | datetime(6) | DEFAULT NULL |
| `AssetId` | int(11) | NOT NULL |
| `CategoryId` | int(11) | NOT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_SoftwareVersions_AssetId` (`AssetId`)
- KEY `IX_SoftwareVersions_CategoryId` (`CategoryId`)

**Foreign Keys:**
- `FK_SoftwareVersions_Assets_AssetId`: (`AssetId`) → `assets`(`Id`) ON DELETE CASCADE
- `FK_SoftwareVersions_SoftwareCategories_CategoryId`: (`CategoryId`) → `softwarecategories`(`Id`) ON DELETE CASCADE

---

## Table 70: `speechlog`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `CustomerNumber` | longtext | DEFAULT NULL |
| `Date` | datetime | NOT NULL |
| `Minuttes` | int(11) | NOT NULL DEFAULT 0 |
| `Lbnr` | longtext | DEFAULT NULL |
| `DentistType` | longtext | DEFAULT NULL |
| `LogId` | int(11) | NOT NULL DEFAULT 0 |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Table 71: `state`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `JobId` | int(11) | NOT NULL |
| `Name` | varchar(20) | NOT NULL |
| `Reason` | varchar(100) | DEFAULT NULL |
| `CreatedAt` | datetime(6) | NOT NULL |
| `Data` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `FK_HangFire_State_Job` (`JobId`)

**Foreign Keys:**
- `FK_HangFire_State_Job`: (`JobId`) → `job`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE

---

## Table 72: `upgradings`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Running` | int(11) | NOT NULL |
| `ServiceAccountId` | int(11) | NOT NULL |
| `Name` | longtext | DEFAULT NULL |
| `Status` | longtext | DEFAULT NULL |
| `Ip` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL DEFAULT '0001-01-01 00:00:00.000000' |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_Upgradings_ServiceAccountId` (`ServiceAccountId`)

**Foreign Keys:**
- `FK_Upgradings_ServiceAccounts_ServiceAccountId`: (`ServiceAccountId`) → `serviceaccounts`(`Id`) ON DELETE CASCADE

---

## Table 73: `userclaims`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `UserId` | varchar(255) | NOT NULL |
| `ClaimType` | longtext | DEFAULT NULL |
| `ClaimValue` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:**
- KEY `IX_UserClaims_UserId` (`UserId`)

**Foreign Keys:**
- `FK_UserClaims_AspNetUsers_UserId`: (`UserId`) → `aspnetusers`(`Id`) ON DELETE CASCADE

---

## Table 74: `userlogins`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `LoginProvider` | varchar(255) | NOT NULL |
| `ProviderKey` | varchar(255) | NOT NULL |
| `ProviderDisplayName` | longtext | DEFAULT NULL |
| `UserId` | varchar(255) | NOT NULL |

**PRIMARY KEY:** (`LoginProvider`, `ProviderKey`)

**Indexes:**
- KEY `IX_UserLogins_UserId` (`UserId`)

**Foreign Keys:**
- `FK_UserLogins_AspNetUsers_UserId`: (`UserId`) → `aspnetusers`(`Id`) ON DELETE CASCADE

---

## Table 75: `userroles`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `UserId` | varchar(255) | NOT NULL |
| `RoleId` | varchar(255) | NOT NULL |
| `Discriminator` | varchar(34) | NOT NULL |
| `UserId1` | varchar(255) | DEFAULT NULL |

**PRIMARY KEY:** (`UserId`, `RoleId`)

**Indexes:**
- KEY `IX_UserRoles_RoleId` (`RoleId`)
- KEY `IX_UserRoles_UserId1` (`UserId1`)

**Foreign Keys:**
- `FK_UserRoles_AspNetRoles_RoleId`: (`RoleId`) → `aspnetroles`(`Id`) ON DELETE CASCADE
- `FK_UserRoles_AspNetUsers_UserId`: (`UserId`) → `aspnetusers`(`Id`) ON DELETE CASCADE
- `FK_UserRoles_AspNetUsers_UserId1`: (`UserId1`) → `aspnetusers`(`Id`)

---

## Table 76: `usertokens`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `UserId` | varchar(255) | NOT NULL |
| `LoginProvider` | varchar(255) | NOT NULL |
| `Name` | varchar(255) | NOT NULL |
| `Value` | longtext | DEFAULT NULL |

**PRIMARY KEY:** (`UserId`, `LoginProvider`, `Name`)

**Indexes:** None

**Foreign Keys:**
- `FK_UserTokens_AspNetUsers_UserId`: (`UserId`) → `aspnetusers`(`Id`) ON DELETE CASCADE

---

## Table 77: `variablegroups`

**Columns:**
| Column | Type | Constraints |
|--------|------|-------------|
| `Id` | int(11) | NOT NULL AUTO_INCREMENT |
| `Name` | varchar(256) | DEFAULT NULL |
| `Description` | varchar(1024) | DEFAULT NULL |
| `CreatedBy` | longtext | DEFAULT NULL |
| `CreatedOn` | datetime(6) | NOT NULL |
| `LastModifiedBy` | longtext | DEFAULT NULL |
| `LastModifiedOn` | datetime(6) | DEFAULT NULL |
| `Variables` | longtext | DEFAULT NULL |
| `Type` | varchar(256) | DEFAULT NULL |

**PRIMARY KEY:** (`Id`)

**Indexes:** None

**Foreign Keys:** None

---

## Foreign Key Relationship Summary

| Source Table | FK Column(s) | → Target Table | Target Column(s) | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| adini | ClinicId | clinics | Id | CASCADE | — |
| backupreports | ClinicId | clinics | Id | CASCADE | — |
| backupreports | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| backupserverinstances | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| backupservermanagementservicestatuses | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| backupstatuses | ClinicId | clinics | Id | CASCADE | — |
| backupstatuses | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| clinicgroup | ClinicId | clinics | Id | CASCADE | — |
| clinicgroup | GroupId | groups | Id | CASCADE | — |
| clinicmanualservice | ClinicsId | clinics | Id | CASCADE | — |
| clinicmanualservice | ManualServicesId | manualservices | Id | CASCADE | — |
| clinicmodule | ClinicsId | clinics | Id | CASCADE | — |
| clinicmodule | ModulesId | modules | Id | CASCADE | — |
| clinicservercomments | ClinicServerId | clinicservermanagementservicestatuses | Id | CASCADE | — |
| clinicservermanagementservicestatuses | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| clinicservice | ClinicId | clinics | Id | CASCADE | — |
| clinicservice | ServiceId | services | Id | CASCADE | — |
| clinicserviceaccount | ClinicsId | clinics | Id | CASCADE | — |
| clinicserviceaccount | ServiceAccountsId | serviceaccounts | Id | CASCADE | — |
| clinicvariablegroups | ClinicId | clinics | Id | CASCADE | — |
| clinicvariablegroups | VariableGroupId | variablegroups | Id | CASCADE | — |
| computerprograms | ComputerId | computers | Id | CASCADE | — |
| computers | ClinicId | clinics | Id | CASCADE | — |
| computersoftwareproduct | ComputerId | computers | Id | CASCADE | — |
| computersoftwareproduct | KategoriId | softwarecategories | Id | CASCADE | — |
| datareplicationservicecomments | DataReplicationServiceStatusId | datareplicationservicestatuses | Id | CASCADE | — |
| datareplicationservicestatuses | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| digisensesettlements | ClinicId | clinics | Id | CASCADE | — |
| downloads | AssetId | assets | Id | — | — |
| groupsoftwarepatch | GroupsId | groups | Id | CASCADE | — |
| groupsoftwarepatch | SoftwarePatchesId | softwareversionpatches | Id | CASCADE | — |
| groupsoftwareversion | GroupsId | groups | Id | CASCADE | — |
| groupsoftwareversion | SoftwareVersionsId | softwareversions | Id | CASCADE | — |
| hangfirejobparameter | JobId | hangfirejob | Id | CASCADE | CASCADE |
| hangfirejobstate | JobId | hangfirejob | Id | CASCADE | CASCADE |
| hangfirestate | JobId | hangfirejob | Id | CASCADE | CASCADE |
| jobparameter | JobId | job | Id | CASCADE | CASCADE |
| jobstate | JobId | job | Id | CASCADE | CASCADE |
| licens | ClinicId | clinics | Id | CASCADE | — |
| roleclaims | RoleId | aspnetroles | Id | CASCADE | — |
| serviceaccounts | ServiceId | services | Id | CASCADE | — |
| softwarecategoryvariablegroup | SoftwareCategoriesId | softwarecategories | Id | CASCADE | — |
| softwarecategoryvariablegroup | VariableGroupsId | variablegroups | Id | CASCADE | — |
| softwareversionpatches | AssetId | assets | Id | — | — |
| softwareversionpatches | SoftwareVersionId | softwareversions | Id | CASCADE | — |
| softwareversions | AssetId | assets | Id | CASCADE | — |
| softwareversions | CategoryId | softwarecategories | Id | CASCADE | — |
| state | JobId | job | Id | CASCADE | CASCADE |
| upgradings | ServiceAccountId | serviceaccounts | Id | CASCADE | — |
| userclaims | UserId | aspnetusers | Id | CASCADE | — |
| userlogins | UserId | aspnetusers | Id | CASCADE | — |
| userroles | RoleId | aspnetroles | Id | CASCADE | — |
| userroles | UserId | aspnetusers | Id | CASCADE | — |
| userroles | UserId1 | aspnetusers | Id | — | — |
| usertokens | UserId | aspnetusers | Id | CASCADE | — |

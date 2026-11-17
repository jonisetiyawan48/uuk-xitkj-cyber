export const MODULES = [
  [
    "dashboard",
    "Dashboard",
    "layout-dashboard",
    [
      "Overview",
      "Activity Feed",
      "Calendar"
    ]
  ],
  [
    "hr",
    "Human Resources",
    "users",
    [
      "Employees",
      "Employee Detail",
      "Departments",
      "Attendance",
      "Leave Requests"
    ]
  ],
  [
    "projects",
    "Project Management",
    "briefcase",
    [
      "Projects",
      "Project Detail",
      "Tasks",
      "Task Detail",
      "Milestones",
      "Team Members"
    ]
  ],
  [
    "documents",
    "Document Center",
    "folder",
    [
      "Explorer",
      "Folder Detail",
      "Document Detail",
      "Upload",
      "Shared Documents"
    ]
  ],
  [
    "helpdesk",
    "IT Helpdesk",
    "headset",
    [
      "Tickets",
      "Create Ticket",
      "Ticket Detail",
      "Ticket Comments",
      "Knowledge Base"
    ]
  ],
  [
    "assets",
    "Asset Management",
    "monitor",
    [
      "Assets",
      "Asset Detail",
      "Borrowing",
      "Return History"
    ]
  ],
  [
    "finance",
    "Finance",
    "wallet",
    [
      "Expense Requests",
      "Expense Detail",
      "Approval Queue",
      "Payment History"
    ]
  ],
  [
    "reports",
    "Reports & Analytics",
    "chart",
    [
      "Report Dashboard",
      "Report Builder",
      "Export History"
    ]
  ],
  [
    "admin",
    "Administration",
    "settings",
    [
      "Users",
      "Roles",
      "Settings",
      "Audit Logs",
      "Notifications"
    ]
  ],
  [
    "account",
    "My Account",
    "user",
    [
      "Login",
      "Forgot Password",
      "Reset Password",
      "My Profile"
    ]
  ]
];
export const DEMO_USERS = {
  "employee": [
    "Aditya Pratama",
    "Employee",
    "Employee"
  ],
  "manager": [
    "Nadia Putri",
    "Manager",
    "Project Manager"
  ],
  "hr": [
    "Dina Maharani",
    "HR",
    "HR Officer"
  ],
  "admin": [
    "Bima Saputra",
    "Administrator",
    "System Administrator"
  ]
};
export const DEPTS = [
  "Engineering",
  "Cyber Security",
  "Operations",
  "Human Resources",
  "Finance",
  "Marketing"
];
export const NAMES = [
  "Aditya Pratama",
  "Nadia Putri",
  "Rizky Maulana",
  "Dina Maharani",
  "Bima Saputra",
  "Sarah Amelia",
  "Fajar Nugroho",
  "Laras Ayu",
  "Dimas Prakoso",
  "Nabila Zahra",
  "Raka Wijaya",
  "Citra Anindya",
  "Kevin Wicaksono",
  "Tasya Maharani",
  "Daffa Ramadhan",
  "Aurel Zahra",
  "Reza Maulana",
  "Dewi Kartika",
  "Bagas Arya",
  "Zahra Amelia",
  "Putra Fadillah",
  "Nisa Amalia",
  "Rafi Akbar",
  "Hana Kirana"
];
export const TABLES = {
  "hr/employees": [
    "employees",
    [
      [
        "name",
        "Employee"
      ],
      [
        "department",
        "Department"
      ],
      [
        "position",
        "Position"
      ],
      [
        "email",
        "Email"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "hr/departments": [
    "employees",
    [
      [
        "department",
        "Department"
      ],
      [
        "name",
        "Employee"
      ],
      [
        "position",
        "Position"
      ]
    ]
  ],
  "hr/attendance": [
    "attendance",
    [
      [
        "employee",
        "Employee"
      ],
      [
        "day",
        "Date"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "hr/leave-requests": [
    "leave_requests",
    [
      [
        "employee",
        "Employee"
      ],
      [
        "kind",
        "Leave Type"
      ],
      [
        "start_date",
        "From"
      ],
      [
        "end_date",
        "To"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "projects/projects": [
    "projects",
    [
      [
        "title",
        "Project"
      ],
      [
        "owner",
        "Owner"
      ],
      [
        "status",
        "Status"
      ],
      [
        "progress",
        "Progress %"
      ],
      [
        "deadline",
        "Deadline"
      ]
    ]
  ],
  "projects/tasks": [
    "tasks",
    [
      [
        "title",
        "Task"
      ],
      [
        "assignee",
        "Assignee"
      ],
      [
        "status",
        "Status"
      ],
      [
        "priority",
        "Priority"
      ],
      [
        "due",
        "Due"
      ]
    ]
  ],
  "projects/milestones": [
    "milestones",
    [
      [
        "title",
        "Milestone"
      ],
      [
        "due",
        "Due"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "projects/team-members": [
    "employees",
    [
      [
        "name",
        "Member"
      ],
      [
        "department",
        "Department"
      ],
      [
        "position",
        "Role"
      ]
    ]
  ],
  "documents/explorer": [
    "documents",
    [
      [
        "name",
        "Document"
      ],
      [
        "folder",
        "Folder"
      ],
      [
        "owner",
        "Owner"
      ],
      [
        "size",
        "Size"
      ],
      [
        "visibility",
        "Visibility"
      ]
    ]
  ],
  "documents/shared-documents": [
    "documents",
    [
      [
        "name",
        "Document"
      ],
      [
        "owner",
        "Owner"
      ],
      [
        "visibility",
        "Access"
      ],
      [
        "created",
        "Date"
      ]
    ]
  ],
  "helpdesk/tickets": [
    "tickets",
    [
      [
        "title",
        "Ticket"
      ],
      [
        "status",
        "Status"
      ],
      [
        "priority",
        "Priority"
      ],
      [
        "category",
        "Category"
      ],
      [
        "assignee",
        "Assigned To"
      ]
    ]
  ],
  "assets/assets": [
    "assets",
    [
      [
        "name",
        "Asset"
      ],
      [
        "tag",
        "Asset Tag"
      ],
      [
        "category",
        "Category"
      ],
      [
        "status",
        "Status"
      ],
      [
        "holder",
        "Holder"
      ]
    ]
  ],
  "assets/return-history": [
    "loans",
    [
      [
        "asset_id",
        "Asset ID"
      ],
      [
        "employee",
        "Employee"
      ],
      [
        "borrowed",
        "Borrowed"
      ],
      [
        "returned",
        "Returned"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "finance/expense-requests": [
    "expenses",
    [
      [
        "title",
        "Expense"
      ],
      [
        "requester",
        "Requester"
      ],
      [
        "amount",
        "Amount"
      ],
      [
        "category",
        "Category"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "finance/approval-queue": [
    "expenses",
    [
      [
        "title",
        "Expense"
      ],
      [
        "requester",
        "Requester"
      ],
      [
        "amount",
        "Amount"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "finance/payment-history": [
    "expenses",
    [
      [
        "title",
        "Payment"
      ],
      [
        "amount",
        "Amount"
      ],
      [
        "status",
        "Status"
      ],
      [
        "created",
        "Date"
      ]
    ]
  ],
  "admin/users": [
    "employees",
    [
      [
        "name",
        "User"
      ],
      [
        "email",
        "Email"
      ],
      [
        "department",
        "Department"
      ],
      [
        "status",
        "Status"
      ]
    ]
  ],
  "admin/audit-logs": [
    "activity",
    [
      [
        "actor",
        "Actor"
      ],
      [
        "action",
        "Action"
      ],
      [
        "created",
        "Timestamp"
      ]
    ]
  ],
  "admin/notifications": [
    "notifications",
    [
      [
        "title",
        "Notification"
      ],
      [
        "body",
        "Description"
      ],
      [
        "created",
        "Date"
      ]
    ]
  ],
  "reports/export-history": [
    "exports",
    [
      [
        "title",
        "Report"
      ],
      [
        "created",
        "Created"
      ],
      [
        "actor",
        "Requested By"
      ]
    ]
  ]
};
export const META = {
  "dashboard": {
    "title": "Dashboard",
    "icon": "layout-dashboard",
    "pages": [
      "Overview",
      "Activity Feed",
      "Calendar"
    ]
  },
  "hr": {
    "title": "Human Resources",
    "icon": "users",
    "pages": [
      "Employees",
      "Employee Detail",
      "Departments",
      "Attendance",
      "Leave Requests"
    ]
  },
  "projects": {
    "title": "Project Management",
    "icon": "briefcase",
    "pages": [
      "Projects",
      "Project Detail",
      "Tasks",
      "Task Detail",
      "Milestones",
      "Team Members"
    ]
  },
  "documents": {
    "title": "Document Center",
    "icon": "folder",
    "pages": [
      "Explorer",
      "Folder Detail",
      "Document Detail",
      "Upload",
      "Shared Documents"
    ]
  },
  "helpdesk": {
    "title": "IT Helpdesk",
    "icon": "headset",
    "pages": [
      "Tickets",
      "Create Ticket",
      "Ticket Detail",
      "Ticket Comments",
      "Knowledge Base"
    ]
  },
  "assets": {
    "title": "Asset Management",
    "icon": "monitor",
    "pages": [
      "Assets",
      "Asset Detail",
      "Borrowing",
      "Return History"
    ]
  },
  "finance": {
    "title": "Finance",
    "icon": "wallet",
    "pages": [
      "Expense Requests",
      "Expense Detail",
      "Approval Queue",
      "Payment History"
    ]
  },
  "reports": {
    "title": "Reports & Analytics",
    "icon": "chart",
    "pages": [
      "Report Dashboard",
      "Report Builder",
      "Export History"
    ]
  },
  "admin": {
    "title": "Administration",
    "icon": "settings",
    "pages": [
      "Users",
      "Roles",
      "Settings",
      "Audit Logs",
      "Notifications"
    ]
  },
  "account": {
    "title": "My Account",
    "icon": "user",
    "pages": [
      "Login",
      "Forgot Password",
      "Reset Password",
      "My Profile"
    ]
  }
};

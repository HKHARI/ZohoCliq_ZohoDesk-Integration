
//Configure a scheduler that reminds you of tasks and posts the message in a chat, channel or a bot!
// ********************** CONSTANTS START **********************
MAIL_URL = "https://mail.zoho.com/api/accounts/7171655000000008002/messages/view?folderId=7171655000004286001&status=unread";
DESK_SEARCH_URL = "https://desk.zoho.com/api/v1/tickets/search?ticketNumber=";
DESK_VIEW_URL = "https://desk.zoho.com/api/v1/tickets";
CLIQ_DB_NAME = "supportticketdetails";
CLIQ_ANNOUNCEMENT_CHANNEL = "summatg";
//Used for debugging
CLIQ_ANNOUNCEMENT_CHAT = "CT_2242124809301247175_64396901-T-2243198282653208592";
ERROR_LOGGER = "";
// ********************** CONSTANTS END **********************
// ********************** VARIABLE START **********************
open_ticket_data = {};
// ********************** VARIABLE END **********************
support_mails = invokeurl
[
	url :MAIL_URL
	type :GET
	headers:{"Accept":"application/json"}
	connection:"support_ticket_handling"
];
support_ticket_ids = "";
for each  message in support_mails.get("data")
{
	subject = message.get("subject");
	ticket_id = subject.subString(subject.indexOf("[##") + 3,subject.indexOf("##]"));
	support_ticket_ids = if(support_ticket_ids == "",ticket_id,support_ticket_ids + "," + ticket_id);
}
mentioned_support_tickets = invokeurl
[
	url :DESK_SEARCH_URL + support_ticket_ids
	type :GET
	headers:{"Accept":"application/json","orgId":"4335217"}
	connection:"support_ticket_handling"
];
assigned_support_tickets = invokeurl
[
	url :DESK_VIEW_URL
	type :GET
	parameters:{"viewId":"24003485688769","fields":"subject,cf_sdp_od_module,cf_sdp_od_auto_assist,createdTime,webUrl,ticketNumber"}
	headers:{"Accept":"application/json","orgId":"4335217"}
	connection:"support_ticket_handling"
];
all_support_tickets = {};
all_support_tickets.insertAll(mentioned_support_tickets.get("data"));
all_support_tickets.insertAll(assigned_support_tickets.get("data"));
ticket_ids = {};
for each  ticket in all_support_tickets
{
	if(ticket.get("statusType") == "Closed" || ticket_ids.containsValue(ticket.get("ticketNumber")))
	{
		continue;
	}
	ticket_ids.insert(ticket.get("ticketNumber"));
	auto_assist = if(ticket.get("cf").get("cf_sdp_od_auto_assist_field") == null,"N/A",ticket.get("cf").get("cf_sdp_od_auto_assist_field"));
	total_hours = ticket.get("createdTime").hoursbetween(zoho.currenttime);
	open_for = if(total_hours < 24,total_hours + " Hours",(total_hours / 24).floor() + " Days " + total_hours % 24 + " Hours");
	values_map = Map();
	values_map.put("weburl",ticket.get("webUrl"));
	values_map.put("autoassit",auto_assist);
	values_map.put("ticketsubject",ticket.get("subject"));
	values_map.put("module",ticket.get("cf").get("cf_sdp_od_module"));
	values_map.put("pitstopdisplayid",ticket.get("ticketNumber"));
	values_map.put("createdtime",ticket.get("createdTime"));
	response_map = zoho.cliq.createRecord(CLIQ_DB_NAME,values_map);
}
ticket_list = zoho.cliq.getRecords(CLIQ_DB_NAME,Map());
report_rows = {};
for each  ticket in ticket_list.get("list")
{
	total_hours = ticket.get("createdtime").hoursbetween(zoho.currenttime);
	pending_for = if(total_hours < 24,total_hours + " Hours",(total_hours / 24).floor() + " Days " + total_hours % 24 + " Hours");
	button_conf = "[+:thumbsup: Work Done](invoke.function|HandleTicket|harishkumar.k@zohocorp.com|" + ticket.get("id") + ")\n\n";
	if(ticket.get("taskid") == 0)
	{
		button_conf = button_conf + "[+:task: Add Task](invoke.function|HandleTicket|harishkumar.k@zohocorp.com|" + ticket.get("id") + ")";
	}
	row_data = {"Ticket ID":"[" + ticket.get("pitstopdisplayid") + "](" + ticket.get("weburl") + ")","Subject":ticket.get("ticketsubject"),"Module":ticket.get("module"),"Pending For":pending_for,"Auto Assist":ticket.get("autoassit"),"Action":button_conf};
	report_rows.add(row_data);
}
report_conf = {"text":"Hi, Good Morning","bot":{"name":"Knight Owl","image":"https://raw.githubusercontent.com/HKHARI/ThamizhKural/main/owl_bot.png"},"card":{"thumbnail":"https://raw.githubusercontent.com/HKHARI/ThamizhKural/main/ticket.png"},"slides":{{"type":"table","title":"Pending Customer Tickets","data":{"headers":{"Ticket ID","Subject","Module","Pending For","Auto Assist","Action"},"rows":report_rows}}}};
//zoho.cliq.postToChat(CLIQ_ANNOUNCEMENT_CHAT,report_conf,"support_ticket_handling");
zoho.cliq.postToChannel(CLIQ_ANNOUNCEMENT_CHANNEL,report_conf,"support_ticket_handling");

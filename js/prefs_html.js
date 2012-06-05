var HTMLControl_checkmarkImages = {
	on: "img/checkmark_active.svg",
	off: "img/checkmark_inactive.svg",
	disabled: "img/checkmark_disabled.svg"
};

function HTMLControl_checkmarkToggle(){
	if (!this.enabled) return;

	if (this.value) this.value=false;
	else this.value=true;
	
	this.update();
	markDirty();
}

function HTMLControl_checkmarkImmediateToggle(){
	if (!this.enabled) return;

	if (this.value) this.value=false;
	else this.value=true;
	
	this.update();
	save();
}

function HTMLControl_checkmarkUpdate(){
	this.enabled = this.enabler(this);
	if (!this.enabled) { this.src = this.images.disabled; this.alt="disabled"; this.style.cursor="default";}
	else if (this.value) { this.src = this.images.on; this.alt="checked"; this.style.cursor="pointer";}
	else { this.src = this.images.off; this.alt="unchecked"; this.style.cursor="pointer";}
}

function HTMLControl_checkmarkArrayUpdate(indirect){
	if(!indirect){ // Broadcast update
		for(var field in this.parentControl.fields) this.parentControl[field].update(true);
		return;
	}
	
	this.enabled = this.enabler(this);
	if (!this.enabled) { this.src = this.images.disabled; this.alt="disabled"; this.style.cursor="default";}
	else if (this.value) { this.src = this.images.on; this.alt="checked"; this.style.cursor="pointer";}
	else { this.src = this.images.off; this.alt="unchecked"; this.style.cursor="pointer";}
}

function HTMLControl_addInputFieldRow(args) {
	var HTML = '<tr><td>';
	HTML += '<input type="text" ' + 
		((args.size) ? ('style="width:' + args.size+ ';text-align:center" ') : '') + 
		'id="pref-' + args.pref.key + '">';
	HTML += '</td><td>';
	HTML += '<b>' + args.pref.name + '</b>';
	HTML += args.comment || "";
	HTML += '<span id="pref-' + args.pref.key +'-err"></span>';
	HTML += "</td></tr>";
	
	args.multiplier = args.multiplier || 1;
	
	args.parent.innerHTML += HTML;
	
	args.pref.initHTMLControl = function() {
		this.HTMLControl = document.getElementById('pref-' + this.key);
		this.HTMLControl.get = function () { return (this.value * args.multiplier); }
		this.HTMLControl.set = function (value) { this.value = (value / args.multiplier); }
		this.saveHTML = function () { 
			var result=this.set(this.HTMLControl.get());
			document.getElementById('pref-' + this.key + '-err').innerHTML = result.message;
		}
		
		this.HTMLControl.set(this.get());
		
		this.HTMLControl.oninput=markDirty;
	}
}

function HTMLControl_addCheckmarkRow(args) {

	var HTML = '<tr><td>';
	HTML += '<img ' + 'id="pref-' + args.pref.key + '" class="checkmark">';
	HTML += '</td><td>';
	HTML += '<b>' + args.pref.name + '</b>';
	HTML += args.comment || "";
	HTML += '<span id="pref-' + args.pref.key +'-err"></span>';
	HTML += "</td></tr>";
	
	args.parent.innerHTML += HTML;

	args.pref.initHTMLControl = function() {
		this.HTMLControl = document.getElementById('pref-' + this.key);
		this.HTMLControl.get = function () { return this.value; }
		this.HTMLControl.set = function (value) { this.value = value; this.update(); }
		this.HTMLControl.enabler = args.enabler || (function() {return true;});
		this.HTMLControl.update = HTMLControl_checkmarkUpdate;
		this.HTMLControl.images = args.images;
		this.saveHTML = function () { 
			var result=this.set(this.HTMLControl.get());
			document.getElementById('pref-' + this.key + '-err').innerHTML = result.message;
		}
		
		this.HTMLControl.set(this.get());
		
		this.HTMLControl.onclick = HTMLControl_checkmarkToggle;
	};
}

function HTMLControl_addCheckmarkImmediateRow(args){
	var HTML = '<tr><td>';
	HTML += '<img ' + 'id="pref-' + args.pref.key + '" class="checkmark">';
	HTML += '</td><td>';
	HTML += '<b>' + args.pref.name + '</b>';
	HTML += args.comment || "";
	HTML += '<span id="pref-' + args.pref.key +'-err"></span>';
	HTML += "</td></tr>";
	
	args.parent.innerHTML += HTML;

	args.pref.initHTMLControl = function() {
		this.HTMLControl = document.getElementById('pref-' + this.key);
		this.HTMLControl.get = function () { return this.value; }
		this.HTMLControl.set = function (value) { this.value = value; this.update(); }
		this.HTMLControl.enabler = args.enabler || (function() {return true;});
		this.HTMLControl.update = HTMLControl_checkmarkUpdate;
		this.HTMLControl.images = args.images;
		this.saveHTML = function () { 
			var result=this.set(this.HTMLControl.get());
			document.getElementById('pref-' + this.key + '-err').innerHTML = result.message;
		}
		
		this.HTMLControl.set(this.get());
		
		this.HTMLControl.onclick = HTMLControl_checkmarkImmediateToggle;
	};
}

function HTMLControl_addCheckArrayHeader(args) {

	var HTML = '<tr><td></td>';
	for(var field in args.pref.fields) HTML += '<td><b>'+args.pref.fields[field].name+'</b></td>';
	HTML += "</tr>";
	
	args.parent.innerHTML += HTML;
}

/* function HTMLControl_addCheckArraySpan(args) {
	var n = 0;
	for(var field in args.pref.fields) n++;
	
	var HTML = '<tr><td colspan=' + (n+1) + ' class="span">';
	HTML += '<i><b>'+args.name+'</b></i>';
	HTML += "</td></tr>";
	
	args.parent.innerHTML += HTML;
} */

/* function HTMLControl_addCheckArraySpan(args) {
	var HTML = '<tr><td class="span">';
	HTML += '<i><b>'+args.name+'</b></i></td>';
	for(var field in args.pref.fields) HTML += '<td></td>';
	HTML += "</tr>";
	
	args.parent.innerHTML += HTML;
}*/

function HTMLControl_addCheckArraySpan(args) {
	var HTML = '<tr class="span"><td></td>';
	for(var field in args.pref.fields) HTML += '<td></td>';
	HTML += "</tr>";
	
	args.parent.innerHTML += HTML;
}

function HTMLControl_addCheckArrayRow(args) {

	var HTML = '<tr id="pref-' + args.pref.key + '" ';
	if (args.parity) HTML += 'class="' + args.parity + '"';  
	HTML += '><td>';
	HTML += '<b>' + args.pref.name + '</b>';
	HTML += '<span id="pref-' + args.pref.key +'-err"></span></td>';
	for(var field in args.pref.fields) HTML += '<td><img ' + 'id="pref-' + args.pref.key + '-' + field + '" class="checkmark"></td>';
	HTML += "</tr>";
	
	args.parent.innerHTML += HTML;

	args.pref.initHTMLControl = function() {
		
		this.HTMLControl = new Object();
		this.HTMLControl.fields = this.fields;
		
		for(var field in this.fields) {
			this.HTMLControl[field] = document.getElementById('pref-' + this.key + '-' + field);
			this.HTMLControl[field].enabler = (args.enabler) ? args.enabler(this.HTMLControl) : (function() {return true;});
			this.HTMLControl[field].images = args.images;
			this.HTMLControl[field].update = HTMLControl_checkmarkArrayUpdate;
			this.HTMLControl[field].onclick = HTMLControl_checkmarkToggle;
			this.HTMLControl[field].field = field;
			this.HTMLControl[field].parentControl = this.HTMLControl;
		}
		
		this.HTMLControl.feed = this.feed || false;
		
		this.HTMLControl.get = function () { 
			var result = new Object();
			for(var field in this.fields) result[field] = this[field].value;
			return result;
		}
		this.HTMLControl.set = function (value) { 
			for(var field in this.fields) this[field].value = value[field];
			for(var field in this.fields) this[field].update(); 
		}
		
		this.saveHTML = function () { 
			var result=this.set(this.HTMLControl.get());
			document.getElementById('pref-' + this.key + '-err').innerHTML = result.message;
		}
		
		this.HTMLControl.set(this.get());
	};
}
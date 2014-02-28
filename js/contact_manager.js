//@Going JVIary
$(function(){
    //**Model**
    //create the Contact model class with attributes
    var Contact = Backbone.Model.extend({
        defaults: function(){
            return{
                last_name    : "empty",
                first_name   : "empty",
                email       : "empty",
                phone_number : "empty",
                order       : contactList.nextOrder(), //to track the contacts order
                selected    : false //to identify if its checked
            }
        },

        //toggle the checked state of this Contact item
        toggle: function(){
            this.save({selected: !this.get("selected")});
            if(!this.selected) $("#clear-selected").show();
        }
    }); //end of Contact

    //**Collection**
    //create the collection class of our Contact model
    var ContactList = Backbone.Collection.extend({
        model: Contact, //add reference to Contact model
        localStorage: new Backbone.LocalStorage("contact-storage"), //save our contacts' attributes under "contact-storage" namespace in LocalStorage

        //filter down the list of checked items
        checked: function(){
            return this.where({selected: true})
        },

        //filter down the list to only unchecked items
        unchecked: function(){
            return this.where({selected: false})
        },
        
        //to keep track of the order of the contacts, generates the next order number for new items
        nextOrder: function(){
            if(this.length===0) return 1;
            return this.last().get("order")+1;
        },

        searchByFirstName: function(letters){
            if(letters=="") return this; //return if search item is blank
            var pattern = new RegExp(letters, "gi"); //use RegEx to search and match the input string
            return _(this.filter(function(data) {
                return pattern.test(data.get($("select").val()));
            }));

        },

        comparator: "last_name" //inserted each contact according to lastName
    });//end of ContactList

    var contactList = new ContactList(); //create our global collection of contact list

    //**View**
    //create the DOM element for a contact
    var ContactView = Backbone.View.extend({
        tagName         : "li", //let the tagname of the element be a list
        template        : _.template($("#contact-template").html()), //cache the template function for a single contact using Underscore.js' _.template
        editTemplate    : _.template($("#edit-template").html()), //cache the edit template
        //events specific to an item
        events: {
            "click .toggle"     : "toggleChecked",
            "dblclick .view"    : "edit",
            "click #edit-btn"   : "edit",
            "click #update-btn" : "update",
            "click #cancel-btn" : "cancel",
            "click a.destroy"   : "destroy",
            "keypress .edit"    : "updateOnEnter"
        },

        //the view listens for changes to its model
        initialize: function(){
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "destroy", this.remove);
        },

        //render property
        render: function(){
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass("selected", this.model.get("selected"));
            return this;
        },

        //toggle contacts using the toggle function of the model
        toggleChecked: function(){
            this.model.toggle();
        },

        //switch to editing mode
        edit: function(){
            this.$el.html(this.editTemplate(this.model.toJSON()));
            $(".edit#first_name").focus();
        },

        //exit to editing mode, save changes
        update: function(e){
            var contactData = {};

            $(e.target).closest("div").find(":input").each(function(){
                var el = $(this);
                contactData[el.attr("id")]=el.val();
            });

            if(contactData.first_name && contactData.last_name){
                this.model.save(contactData);
                this.render();               
            }else foundEmpty();

            return;
        },

        //upon clicking cancel button
        cancel: function(){
            this.render();
        },

        //update on pressing enter
        updateOnEnter: function(e){
            if(e.keyCode==13) this.$el.closest("li").find("#update-btn").click();
            return;
        },

        //remove the item, destroy the model
        destroy: function(){
            this.model.destroy();
        }
    }); //end of ContactView

    //**MasterView**
    //create the top level piece of UI
    var AppView = Backbone.View.extend({
        el: $("#appContainer"), //bind to existing skeleton
        statsTemplate: _.template($("#stats-tmpl").html()), //template for the line of statistics at the bottom

        //delegate events for creating and deleting
        events: {
            "click #add-btn"        : "addContact",
            "keypress .input"       : "createOnEnter",
            "keyup #searchBar"      : "search",
            "click #clear-selected" : "clearSelected",
            "click #toggle-all"     : "toggleAll"
        },

        //bind contactList to relevant events
        initialize: function(){
            this.listenTo(contactList, "add", this.addOne);
            this.listenTo(contactList, "reset", this.addAll);
            this.listenTo(contactList, "all", this.render);
            this.allCheckbox = this.$("#toggle-all")[0];
            this.main = $("#main");
            this.footer = this.$('footer');
            contactList.fetch(); //load any pre-existing contacts that might have been saved in localStorage
            $("#contact-list").empty();
            var list = contactList.models;
            contactList.reset(list);
        },

        //render to change statistics
        render: function(){
            var selected = contactList.checked().length;
            var unchecked = contactList.unchecked().length;
            var total = contactList.length;
            

            if(contactList.length){
                $("#showList").show();
                $(".count").slideToggle();
                this.main.show();
            } else{
                this.main.hide();
            }


            this.footer.html(this.statsTemplate({selected: selected, total: total}));
            this.allCheckbox.checked = !unchecked;
        },

        createOnEnter: function(e){
            if(e.keyCode!=13) return;
            this.addContact();
        },

        //add a contact to the list when new contact is added in the contactList
        addOne: function(contact){
            var contactView = new ContactView({model: contact});
            this.$("#contact-list").append(contactView.render().el);
        },

        //add all items in the ContactList at once
        addAll: function(){
            contactList.each(this.addOne, this);
        },

        //create new contact in contactList
        addContact: function() {
            if($("#last_name").val() && $("#first_name").val()){
                var contactData={};
                $("section .input").each(function (i){
                    contactData[this.id] = $(this).val();
                });
                contactList.create(contactData);
                 $("#first_name").focus();
                //clear input fields after successful addition of contact
                $("section .input").each(function(){
                    $(this).val('');
                });
            }else foundEmpty();
        },

        search: function(){
            //contactList.sort();
            contactList.fetch();
            $("#contact-list").empty();
            var letters = $("#searchBar").val().trim();
            var attribute = $("select").val();
            if(letters==""){
                $("#contact-list").empty();
            }//return if search item is blank
 
            var filtered = contactList.filter(function (item){
                return item.get(attribute).toLowerCase().indexOf(letters.toLowerCase()) !== -1;
            });

            contactList.reset(filtered);
        },

        toggleAll: function(){
            var checked = this.allCheckbox.checked;
            contactList.each(function (contact){
                contact.save({'selected': checked});
            });
            if(checked) $("#clear-selected").show();
        },

        clearSelected: function(){
            _.invoke(contactList.checked(), 'destroy');
            return false;
        }
    });
     
    var appView = new AppView(); //create the app
    var foundEmpty = function(){alert("Fields with * are required.");} //prompt if one or both required fields are empty

    //show add contact fields
    $("#add_btn").click(function(){
        $("#addSection").slideToggle();
    });

    $("#showList").click(function(){
        $("#cont").slideToggle();
        $("#suggest").slideToggle();
        $("#clear-selected").slideToggle();
    });
});
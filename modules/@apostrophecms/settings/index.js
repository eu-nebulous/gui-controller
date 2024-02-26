module.exports = {
  options: {
    subforms: {
      displayname: {
        fields: [ 'title' ],
        reload: true
      },
      changePassword: {
        fields: [ 'password' ]
      },
      fullname: {
        label: 'Full Name',
        fields: [ 'firstname', 'lastname' ],
        preview: '{{ firstname }} {{lastname}}'
      },
      organization: {
        label: 'Organization',
        type: 'string',
        fields: [ 'organization' ]
      },
      uuid: {
        label: 'UUID',
        type: 'string',
        fields: [ 'uuid' ]
      }
    },

    groups: {
      account: {
        label: 'Account',
        subforms: [ 'displayname', 'fullname', 'changePassword', 'organization', 'uuid' ]
      }
    }
  }
};

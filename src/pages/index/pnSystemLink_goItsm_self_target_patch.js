/* Optional patch for GW2 pnSystemLink.goItsm
   Use this only if you want one function supporting both _blank and _self.
   - Existing GW2 menu can call pnSystemLink.goItsm("_blank")
   - Auto bridge/login flow can call pnSystemLink.goItsm("_self")
*/
var pnSystemLink = pnSystemLink || {};

pnSystemLink.goItsm = function (target) {
  $.ajax({
    url: "/groupware/pnPortal/getItsmSloParam.do",
    type: "POST",
    data: {},
    success: function (data) {
      if (data.status === "SUCCESS") {
        var form = document.createElement("form");
        form.method = "POST";
        form.action = "https://itsm.youngone.com/custom/youngone/index.do";
        form.target = target || "_blank";

        var params = {
          olmI: data.jsonData.olml,
          companyCode: data.jsonData.companyCode,
          teamCode: data.jsonData.teamCode,
          langCode: Common.getSession("lang").toUpperCase()
        };

        for (var key in params) {
          var input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = params[key] || "";
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      }
    },
    error: function (response, status, error) {
      CFN_ErrorAjax("/groupware/pnPortal/getItsmSloParam.do", response, status, error);
    }
  });
};

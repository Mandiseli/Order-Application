using System.ComponentModel.DataAnnotations;

namespace Order_App.Dtos;

public class ApproveDepositDto
{
    [Range(1, int.MaxValue)]
    public int PendingDepositId { get; set; }
}

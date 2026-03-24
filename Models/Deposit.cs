using System.ComponentModel.DataAnnotations.Schema;

namespace Order_App.Models
{
    public class Deposit
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BonusApplied { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
